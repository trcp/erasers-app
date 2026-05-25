#!/usr/bin/env python3

import os
import sys
import argparse
import logging
import socket
import asyncio
import uvicorn
from pathlib import Path

from fastapi import FastAPI, APIRouter, WebSocket, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from parser import TaskData, get_ip_address

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger('erasers')

SERVER_PORT = 3001


class XmlSaveBody(BaseModel):
    content: str


class ErasersTaskControlServer:
    def __init__(self, task_data_list, ros_master_uri):
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

        self.task_data_list = task_data_list
        self.ros_master_uri = ros_master_uri

        nif_names = [name for _, name in socket.if_nameindex() if name != "lo"]
        self.execution_config = {
            "network_if": nif_names[0] if nif_names else "",
        }

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
        self.task_data_list[task_name].programs[node_name].get_command().variables["start_time"]["default"] = int(body)
        return {"set": True}

    def get_task(self):
        return {key: task.to_json() for key, task in self.task_data_list.items()}

    def run_task(self, task_name: str, node_name: str, body=Body(...)):
        logger.info(f"▶ [{task_name}/{node_name}] タスク開始")
        self.task_data_list[task_name].programs[node_name].run(body, self.ros_master_uri)
        return {"run": True}

    def task_running(self, task_name: str, node_name: str):
        node = self.task_data_list[task_name].programs[node_name]
        return {"is_running": node.is_running(), "exit_code": node.get_exit_code()}

    def kill_task(self, task_name: str, node_name: str):
        node = self.task_data_list[task_name].programs[node_name]
        if node.is_running():
            logger.info(f"■ [{task_name}/{node_name}] タスク停止")
            node.kill()
        return {"killed": True}

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
        logger.info(f"設定更新: network_if={network_if}, ros_master_uri={self.ros_master_uri}")
        for task in self.task_data_list.values():
            for node in task.programs.values():
                node.network_if = network_if
        return {"ok": True}

    async def websocket_endpoint(self, websocket: WebSocket, task_name: str, node_name: str):
        logger.info(f"WebSocket接続: {task_name}/{node_name}")
        await websocket.accept()

        node = self.task_data_list[task_name].programs[node_name]
        if node.is_running():
            log_file = node.get_log_file_path()
            with open(log_file, "r") as f:
                while node.is_running():
                    try:
                        line = f.readline()
                        if line:
                            await websocket.send_text(line)
                        else:
                            await asyncio.sleep(0.1)
                    except Exception as e:
                        logger.debug(f"WebSocket read end: {e}")
                        break


def run_fastapi(path):
    lua_files = [os.path.join(path, i) for i in os.listdir(path) if i.endswith(".lua")]
    task_data_list = {}
    for p in lua_files:
        task_data = TaskData(p)
        task_data_list[task_data.task_name] = task_data

    task_names = list(task_data_list.keys())
    logger.info(f"読み込み完了: {len(task_names)} タスク {task_names}")

    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    server = ErasersTaskControlServer(task_data_list, "localhost")
    app.include_router(server.router)

    logger.info(f"サーバー起動: http://0.0.0.0:{SERVER_PORT}")
    uvicorn.run(app, host="0.0.0.0", port=SERVER_PORT, access_log=False)


if __name__ == "__main__":
    logger.info("Erasers Task Controller Server 起動")

    parser = argparse.ArgumentParser(description="erasers task controller server")
    parser.add_argument("--config", type=str, required=True, help="path to config directory")
    args = parser.parse_args()

    config_path = str(Path(args.config).resolve())
    lua_files = [f for f in os.listdir(config_path) if f.endswith(".lua")]
    if not lua_files:
        logger.error(f"No Lua task files found in {config_path}")
        sys.exit(1)

    logger.info(f"設定ディレクトリ: {config_path}")
    run_fastapi(config_path)
