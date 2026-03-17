#!/usr/bin/env python

import os
import sys
import logging
import subprocess
import json
import socket
import threading
from threading import Thread
import tkinter as tk
from tkinter import filedialog, ttk, messagebox
from pathlib import Path

import webbrowser

import asyncio
import uvicorn
from fastapi import FastAPI, APIRouter, WebSocket, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

class XmlSaveBody(BaseModel):
    content: str

from parser import TaskData

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('uvicorn')

class ErasersTaskControlServer:
    def __init__(self, name: str, task_data_list, ros_master_uri):
        self.name = name
        self.router = APIRouter()
        self.router.add_api_route("/get_task", self.get_task, methods=["GET"])
        self.router.add_api_route("/run_task/{task_name}/{node_name}", self.run_task, methods=["POST"])
        self.router.add_api_route("/kill_task/{task_name}/{node_name}", self.kill_task, methods=["POST"])
        self.router.add_api_route("/task_running/{task_name}/{node_name}", self.task_running, methods=["GET"])
        self.router.add_api_websocket_route("/ws/{task_name}/{node_name}", self.websocket_endpoint)
        self.router.add_api_route("/set_time/{task_name}/{node_name}", self.set_time, methods=["POST"])
        self.router.add_api_route("/get_xml", self.get_xml, methods=["GET"])
        self.router.add_api_route("/save_xml", self.save_xml, methods=["POST"])

        self.task_data_list = task_data_list

        self.ros_master_uri = ros_master_uri

    def get_xml(self, path: str):
        p = Path(path).resolve()
        if p.suffix.lower() != ".xml":
            raise HTTPException(status_code=400, detail="Only .xml files are allowed")
        if not p.is_file():
            raise HTTPException(status_code=404, detail=f"File not found: {path}")
        return FileResponse(str(p), media_type="application/xml")

    def save_xml(self, path: str, body: XmlSaveBody):
        p = Path(path).resolve()
        if p.suffix.lower() != ".xml":
            raise HTTPException(status_code=400, detail="Only .xml files are allowed")
        if not p.parent.exists():
            raise HTTPException(status_code=400, detail=f"Directory not found: {p.parent}")
        p.write_text(body.content, encoding="utf-8")
        return {"saved": True, "path": str(p)}

    def set_time(self, task_name: str, node_name: str, body=Body(...)):
        self.task_data_list[task_name].programs[node_name].command.variables["start_time"]["default"] = int(body)
        return {"set": True}

    def get_task(self):
        for key in self.task_data_list:
            logger.info(self.task_data_list[key].to_json())

        return {key: self.task_data_list[key].to_json() for key in self.task_data_list}

    def run_task(self, task_name: str, node_name: str, body=Body(...)):
        self.task_data_list[task_name].programs[node_name].run(body, self.ros_master_uri)
        return {"run": True}

    def task_running(self, task_name: str, node_name: str):
        node = self.task_data_list[task_name].programs[node_name]
        is_running = node.is_running()
        return {"is_running": is_running}

    def kill_task(self, task_name: str, node_name: str):
        node = self.task_data_list[task_name].programs[node_name]
        if node.is_running():
            self.task_data_list[task_name].programs[node_name].kill()

        return {"run": True}

    async def websocket_endpoint(self, websocket: WebSocket, task_name: str, node_name: str):
        logger.info(f"ws {task_name} {node_name}")
        await websocket.accept()

        node = self.task_data_list[task_name].programs[node_name]
        if node.is_running():
            log_file = node.get_log_file_path()
            with open(log_file, "r") as f:
                while node.is_running():
                    try:
                        l = f.readline()
                        if l != "":
                            await websocket.send_text(l)
                    except Exception as e:
                        logger.debug(f"WebSocket read end: {e}")
                        break


def run_fastapi(path, ros_master_uri="localhost", docker_mode=False, network_if="wlo1", compose_path=""):
    logger.info("run fastapi")

    if docker_mode:
        subprocess.run(["xhost", "+"], check=False)

    yaml_path = [os.path.join(path, i) for i in os.listdir(path) if i.endswith(".yaml")]
    task_data_list = {}
    for p in yaml_path:
        task_data = TaskData(p, docker_mode=docker_mode, network_if=network_if, compose_path=compose_path)
        task_name = task_data.task_name
        task_data_list[task_name] = task_data

    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    hello = ErasersTaskControlServer("World", task_data_list, ros_master_uri)
    app.include_router(hello.router)

    uvicorn.run(app, host="0.0.0.0", port=3001)


def kill_fastapi():
    import signal
    logger.info(f"killing pid {os.getpid()}")
    os.kill(os.getpid(), signal.SIGINT)


def run_tkinter(start_event, app_state):
    logger.info("run tkinter")
    root = tk.Tk()
    root.title("erasers-app")
    root.geometry("400x380")
    root.resizable(True, True)

    # --- Execution Mode ---
    mode_var = tk.StringVar(value="local")

    def on_mode_changed():
        app_state["execution_mode"] = mode_var.get()
        if mode_var.get() == "docker":
            docker_frame.pack(pady=5, fill=tk.X, padx=10)
        else:
            docker_frame.pack_forget()

    mode_frame = tk.Frame(root)
    mode_frame.pack(pady=5, fill=tk.X, padx=10)
    tk.Label(mode_frame, text="Execution Mode:").pack(side=tk.LEFT)
    tk.Radiobutton(mode_frame, text="Local (ROS)", variable=mode_var, value="local",
                   command=on_mode_changed).pack(side=tk.LEFT, padx=4)
    tk.Radiobutton(mode_frame, text="Docker", variable=mode_var, value="docker",
                   command=on_mode_changed).pack(side=tk.LEFT, padx=4)

    # --- Folder selection ---
    def open_folder_dialog():
        folder_path = filedialog.askdirectory()
        if not folder_path:
            return
        yaml_files = [f for f in os.listdir(folder_path) if f.endswith(".yaml")]
        if len(yaml_files) == 0:
            path_label.config(text=f"path: {folder_path}", fg="red")
            yaml_status_label.config(text="No YAML files found", fg="red")
            app_state["config_path"] = None
            run_button.config(state=tk.DISABLED)
        else:
            path_label.config(text=f"path: {folder_path}", fg="black")
            yaml_status_label.config(text=f"{len(yaml_files)} tasks found", fg="green")
            app_state["config_path"] = folder_path
            run_button.config(state=tk.NORMAL)

    open_button = tk.Button(root, text="Open Folder", command=open_folder_dialog)
    open_button.pack(pady=5)
    path_label = tk.Label(root, text="path: (none selected)")
    path_label.pack(pady=2)
    yaml_status_label = tk.Label(root, text="")
    yaml_status_label.pack(pady=2)

    # --- ROS Master URI ---
    def on_combobox_selected(event):
        app_state["ros_master_uri"] = combobox.get()

    options = ["hsrb80", "hsrb33", "localhost"]
    uri_frame = tk.Frame(root)
    uri_frame.pack(pady=5)
    tk.Label(uri_frame, text="ROS Master URI:").pack(side=tk.LEFT)
    combobox = ttk.Combobox(uri_frame, values=options, width=12)
    combobox.pack(side=tk.LEFT, padx=4)
    combobox.set(options[0])
    app_state["ros_master_uri"] = options[0]
    combobox.bind("<<ComboboxSelected>>", on_combobox_selected)

    # --- Network IF (always visible) ---
    nif_frame = tk.Frame(root)
    nif_frame.pack(pady=5)
    tk.Label(nif_frame, text="Network IF:").pack(side=tk.LEFT)
    nif_options = [name for _, name in socket.if_nameindex() if name != "lo"]
    nif_combo = ttk.Combobox(nif_frame, values=nif_options, width=12)
    nif_combo.pack(side=tk.LEFT, padx=4)
    default_nif = app_state["network_if"] if app_state["network_if"] in nif_options else (nif_options[0] if nif_options else "")
    nif_combo.set(default_nif)
    app_state["network_if"] = default_nif

    def on_nif_selected(event):
        app_state["network_if"] = nif_combo.get()

    nif_combo.bind("<<ComboboxSelected>>", on_nif_selected)

    # --- Docker Settings (hidden by default) ---
    docker_frame = tk.LabelFrame(root, text="Docker Settings")

    compose_row = tk.Frame(docker_frame)
    compose_row.pack(pady=3, fill=tk.X, padx=5)
    tk.Label(compose_row, text="compose.yaml:").pack(side=tk.LEFT)
    compose_entry = tk.Entry(compose_row, width=24)
    compose_entry.pack(side=tk.LEFT, padx=4)
    compose_entry.insert(0, app_state["compose_path"])

    def browse_compose():
        p = filedialog.askopenfilename(
            filetypes=[("YAML files", "*.yaml *.yml"), ("All files", "*.*")]
        )
        if p:
            compose_entry.delete(0, tk.END)
            compose_entry.insert(0, p)
            app_state["compose_path"] = p

    def on_compose_entry_change(*_):
        app_state["compose_path"] = compose_entry.get()

    compose_entry.bind("<FocusOut>", on_compose_entry_change)
    compose_entry.bind("<Return>", on_compose_entry_change)
    tk.Button(compose_row, text="Browse", command=browse_compose).pack(side=tk.LEFT)

    # --- Buttons ---
    button_frame = tk.Frame(root)
    button_frame.pack(pady=5)

    def run_server():
        config_path = app_state.get("config_path")
        ros_master_uri = app_state.get("ros_master_uri")
        if not config_path:
            messagebox.showerror("Error", "Please select a valid config folder first.")
            return
        # sync compose path from entry widget before starting
        app_state["compose_path"] = compose_entry.get()

        execution_mode = app_state.get("execution_mode", "local")
        docker_mode = execution_mode == "docker"
        network_if = app_state.get("network_if", "wlo1")
        compose_path = app_state.get("compose_path", "")

        status_label.config(text="\u27f3 Starting...", fg="orange")
        run_button.config(state=tk.DISABLED)

        def _start():
            try:
                start_event.set()
                run_fastapi(config_path, ros_master_uri=ros_master_uri,
                            docker_mode=docker_mode, network_if=network_if,
                            compose_path=compose_path)
            except Exception as e:
                logger.error(f"FastAPI error: {e}")
                root.after(0, lambda: status_label.config(text=f"Error: {e}", fg="red"))

        def _set_running():
            status_label.config(text="\u2713 Running at http://0.0.0.0:3001", fg="green")

        Thread(target=_start, daemon=True).start()
        root.after(1500, _set_running)

    run_button = tk.Button(button_frame, text="RUN", command=run_server, state=tk.DISABLED)
    run_button.pack(pady=1, side=tk.LEFT)

    def open_browser():
        ros_master_uri = app_state.get("ros_master_uri", "localhost")
        if ros_master_uri == "hsrb80":
            webbrowser.open('http://hsrb80.local:3000/dashboard')
        elif ros_master_uri == "hsrb33":
            webbrowser.open('http://hsrb33.local:3000/dashboard')
        else:
            webbrowser.open('http://localhost:3000/dashboard')

    task_button = tk.Button(button_frame, text="Open task starter", command=open_browser)
    task_button.pack(pady=1, side=tk.LEFT)

    def all_quit():
        kill_fastapi()
        root.destroy()

    quit_button = tk.Button(button_frame, text="Quit", command=all_quit)
    quit_button.pack(pady=1, side=tk.LEFT)

    # --- Status label ---
    status_label = tk.Label(root, text="\u25cf Stopped", fg="gray")
    status_label.pack(pady=8)

    root.mainloop()


if __name__ == "__main__":
    logger.info("start")

    start_event = threading.Event()
    app_state = {
        "config_path": None,
        "ros_master_uri": None,
        "execution_mode": "local",
        "network_if": "wlo1",
        "compose_path": str(Path.home() / "erasers_ws" / "compose.yaml"),
    }

    tkinter_thread = Thread(target=run_tkinter, args=(start_event, app_state), daemon=True)
    tkinter_thread.start()

    # Block until RUN is pressed inside the GUI
    tkinter_thread.join()
