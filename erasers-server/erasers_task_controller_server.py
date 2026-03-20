#!/usr/bin/env python

import os
import sys
import argparse
import logging
import subprocess
import json
import socket
import threading
from threading import Thread
import tkinter as tk
from tkinter import filedialog, messagebox
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

from parser import TaskData, get_ip_address

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
        self.router.add_api_route("/get_network_interfaces", self.get_network_interfaces, methods=["GET"])
        self.router.add_api_route("/get_execution_config", self.get_execution_config, methods=["GET"])
        self.router.add_api_route("/set_execution_config", self.set_execution_config, methods=["POST"])
        self.router.add_api_route("/set_node_config/{task_name}/{node_name}", self.set_node_config, methods=["POST"])

        self.task_data_list = task_data_list
        self.ros_master_uri = ros_master_uri

        nif_names = [name for _, name in socket.if_nameindex() if name != "lo"]
        self.execution_config = {
            "network_if": nif_names[0] if nif_names else "",
        }

        # initialize each node's compose_path to the default
        for task in task_data_list.values():
            for node in task.programs.values():
                node.compose_path = "~/erasers_ws/compose.yaml"

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
        result = {}
        for key, task in self.task_data_list.items():
            task_json = task.to_json()
            for node_key, node in task.programs.items():
                if node_key in task_json.get("programs", {}):
                    task_json["programs"][node_key]["docker_mode"] = node.docker_mode
                    task_json["programs"][node_key]["compose_path"] = node.compose_path
            result[key] = task_json
            logger.info(task_json)
        return result

    def run_task(self, task_name: str, node_name: str, body=Body(...)):
        self.task_data_list[task_name].programs[node_name].run(body, self.ros_master_uri)
        return {"run": True}

    def task_running(self, task_name: str, node_name: str):
        node = self.task_data_list[task_name].programs[node_name]
        is_running = node.is_running()
        exit_code = node.get_exit_code()
        return {"is_running": is_running, "exit_code": exit_code}

    def kill_task(self, task_name: str, node_name: str):
        node = self.task_data_list[task_name].programs[node_name]
        if node.is_running():
            self.task_data_list[task_name].programs[node_name].kill()

        return {"run": True}

    def get_network_interfaces(self):
        interfaces = [
            {"name": name, "ip": get_ip_address(name)}
            for _, name in socket.if_nameindex()
            if name != "lo"
        ]
        return {"interfaces": interfaces}

    def get_execution_config(self):
        return {**self.execution_config, "ros_master_uri": self.ros_master_uri}

    def set_execution_config(self, body=Body(...)):
        if "network_if" in body:
            self.execution_config["network_if"] = body["network_if"]
        if "ros_master_uri" in body:
            self.ros_master_uri = body["ros_master_uri"]
        network_if = self.execution_config["network_if"]
        for task in self.task_data_list.values():
            for node in task.programs.values():
                node.network_if = network_if
        return {"ok": True}

    def set_node_config(self, task_name: str, node_name: str, body=Body(...)):
        node = self.task_data_list[task_name].programs[node_name]
        if "docker_mode" in body:
            node.docker_mode = body["docker_mode"]
            if body["docker_mode"]:
                subprocess.run(["xhost", "+"], check=False)
        if "compose_path" in body:
            node.compose_path = body["compose_path"]
        return {"ok": True}

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


def run_fastapi(path):
    logger.info("run fastapi")

    yaml_path = [os.path.join(path, i) for i in os.listdir(path) if i.endswith(".lua")]
    task_data_list = {}
    for p in yaml_path:
        task_data = TaskData(p)
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

    hello = ErasersTaskControlServer("World", task_data_list, "localhost")
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
    root.geometry("400x280")
    root.resizable(True, True)

    # --- Folder selection ---
    def open_folder_dialog():
        folder_path = filedialog.askdirectory()
        if not folder_path:
            return
        yaml_files = [f for f in os.listdir(folder_path) if f.endswith(".lua")]
        if len(yaml_files) == 0:
            path_label.config(text=f"path: {folder_path}", fg="red")
            yaml_status_label.config(text="No Lua task files found", fg="red")
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

    # --- Buttons ---
    button_frame = tk.Frame(root)
    button_frame.pack(pady=5)

    def run_server():
        config_path = app_state.get("config_path")
        if not config_path:
            messagebox.showerror("Error", "Please select a valid config folder first.")
            return
        status_label.config(text="\u27f3 Starting...", fg="orange")
        run_button.config(state=tk.DISABLED)

        def _start():
            try:
                start_event.set()
                run_fastapi(config_path)
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
        webbrowser.open('http://localhost:3000/taskstarter')

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

    parser = argparse.ArgumentParser(description="erasers task controller server")
    parser.add_argument("--config", type=str, default=None, help="path to config directory (CUI mode)")
    args = parser.parse_args()

    if args.config:
        config_path = str(Path(args.config).resolve())
        yaml_files = [f for f in os.listdir(config_path) if f.endswith(".lua")]
        if len(yaml_files) == 0:
            logger.error(f"No Lua task files found in {config_path}")
            sys.exit(1)
        logger.info(f"CUI mode: loading config from {config_path}")
        run_fastapi(config_path)
    else:
        start_event = threading.Event()
        app_state = {
            "config_path": None,
        }

        tkinter_thread = Thread(target=run_tkinter, args=(start_event, app_state), daemon=True)
        tkinter_thread.start()

        # Block until RUN is pressed inside the GUI
        tkinter_thread.join()
