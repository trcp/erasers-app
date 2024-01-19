#!/usr/bin/env python

import os
import sys
import logging
import subprocess
import json
from threading import Thread
import tkinter as tk
from tkinter import filedialog, ttk

import webbrowser

import asyncio
import uvicorn
from fastapi import FastAPI, APIRouter, WebSocket, Body
from fastapi.middleware.cors import CORSMiddleware

from parser import TaskData

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

        self.task_data_list = task_data_list

        self.ros_master_uri = ros_master_uri

    def get_task(self):
        # return [self.task_data_list[key].to_json() for key in self.task_data_list]
        return {key: self.task_data_list[key].to_json() for key in self.task_data_list}

    def run_task(self, task_name:str, node_name:str, body=Body(...)):
        self.task_data_list[task_name].programs[node_name].run(body, self.ros_master_uri)
        return {"run": True}

    def task_running(self, task_name:str, node_name:str):
        node = self.task_data_list[task_name].programs[node_name]
        is_running = node.is_running()
        # if "start_time" in node.command.variables:
        #     unix_time = node.command.variables["start_time"]
        #     return {"is_running": is_running, "start_time": unix_time}
        # else:
        return {"is_running": is_running}

    def kill_task(self, task_name:str, node_name:str):
        node = self.task_data_list[task_name].programs[node_name]
        if node.is_running():
            self.task_data_list[task_name].programs[node_name].kill()

        return {"run": True}

    async def websocket_endpoint(self, websocket: WebSocket, task_name:str, node_name:str):
        print("ws", task_name, node_name)
        await websocket.accept()

        node = self.task_data_list[task_name].programs[node_name]
        if node.is_running():
            log_file = node.get_log_file_path()
            with open(log_file, "r") as f:
                while node.is_running():
                    l =f.readlines()[-1]

                    await websocket.send_text(l)
                    await asyncio.sleep(0.1)

def run_fastapi(path, ros_master_uri="localhost"):
    app = FastAPI()

    print("run fastapi")

    yaml_path = [os.path.join(path, i) for i in os.listdir(path) if i.endswith(".yaml")]
    task_data_list = {}
    for path in yaml_path:
        task_data = TaskData(path)
        task_name = task_data.task_name
        task_data_list[task_name] = task_data

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    hello = ErasersTaskControlServer("World", task_data_list, ros_master_uri)
    app.include_router(hello.router)

    uvicorn.run(app, host="127.0.0.1", port=3001)

# TODO: not smart
def kill_fastapi():
    import signal
    print(os.getpid())
    os.kill(os.getpid(), signal.SIGINT)


def run_tkinter():
    print("run tkinter")
    root = tk.Tk()
    root.title("erasers-app")
    root.geometry("400x200")

    def open_folder_dialog():
        global config_path
        folder_path = filedialog.askdirectory()
        config_path = folder_path
        if folder_path:
            path_label.config(text=f"{folder_path}")
        else:
            path_label.config(text="No folder selected")

    open_button = tk.Button(root, text="Open Folder", command=open_folder_dialog)
    open_button.pack(pady=5)
    path_label = tk.Label(root, text="path: ")
    path_label.pack(pady=5)


    def on_combobox_selected(event):
        global ros_master_uri
        selected_item = combobox.get()
        ros_master_uri = selected_item
        label.config(text=f"Selected: {selected_item}") 

    options = ["hsrb80", "hsrb33", "localhost"]
    combobox = ttk.Combobox(root, values=options)
    combobox.pack(pady=1)
    combobox.set(options[0])
    global ros_master_uri
    ros_master_uri = options[0]
    label = tk.Label(root, text="Selected: ")
    label.pack(pady=1)
    combobox.bind("<<ComboboxSelected>>", on_combobox_selected)

    button_frame = tk.Frame(root)
    button_frame.pack(side=tk.TOP)

    def run_server():
        global enable_server
        enable_server = True
    run_button = tk.Button(button_frame, text="RUN", command=run_server)
    run_button.pack(pady=1, side=tk.LEFT)

    def open_browser():
        if ros_master_uri == "hsrb80":
            webbrowser.open('http://hsrb80.local:3000/dashboard')
        elif ros_master_uri == "hsrb33":
            webbrowser.open('http://hsrb33.local:3000/dashboard')
        elif ros_master_uri == "localhost":
            webbrowser.open('http://localhost:3000/dashboard')

    task_button = tk.Button(button_frame, text="Open task starter", command=open_browser)
    task_button.pack(pady=1, side=tk.LEFT)
    
    def all_quit():
        kill_fastapi()
        root.destroy()
    quit_button = tk.Button(button_frame, text="Quit", command=all_quit)
    quit_button.pack(pady=1, side=tk.LEFT)

    button_frame.pack_configure(anchor=tk.CENTER)

    root.mainloop()

if __name__ == "__main__":
    print("start")

    config_path = None
    enable_server = False
    ros_master_uri = None
    
    tkinter_thread = Thread(target=run_tkinter)
    tkinter_thread.start()

    import time
    while not enable_server:
        print('waiting for run {}, {}'.format(config_path, ros_master_uri))
        time.sleep(0.5)
        if not config_path:
            continue
        if not ros_master_uri:
            continue

    run_fastapi(config_path, ros_master_uri=ros_master_uri)

    # fastapi_thread = Thread(target=run_fastapi)
    # fastapi_thread.start()
