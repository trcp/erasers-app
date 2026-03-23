#!/usr/bin/env python3

import time
import os
import sys
import subprocess
import logging

from lupa import LuaRuntime

logger = logging.getLogger('erasers')
import json
import socket
import fcntl
import struct


def get_ip_address(ifname):
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        return socket.inet_ntoa(fcntl.ioctl(
            s.fileno(),
            0x8915,  # SIOCGIFADDR
            struct.pack('256s', ifname[:15].encode('utf-8'))
        )[20:24])
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


class NodeData:
    def __init__(self):
        self.node_name = ""
        self.displa_name = ""
        self.description = ""

        class Command:
            template = ""
            kill = ""
            variables = {}

        self.command = Command()

        self.proc = None
        self.log_file = None
        self.log_file_name = None

        self.docker_mode = False
        self.network_if = "wlo1"
        self.compose_path = ""
        self.container_id = None

    def build_cmd(self, template, ros_master_uri, opt):
        logger.debug(f"build_cmd: template={template!r}, ros_master_uri={ros_master_uri}, opt={opt}")

        # settings for ros master uri
        uri_map = {"hsrb80": "192.168.11.80", "hsrb33": "192.168.11.33", "localhost": "localhost"}
        host = uri_map.get(ros_master_uri, ros_master_uri)
        rm_uri = "http://{}:11311".format(host)
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"

        # settings for option
        formatted_cmd = template
        for key, value in opt.items():
            formatted_cmd = formatted_cmd.replace(f'${{{key}}}', str(value))

        ros_ip = get_ip_address(self.network_if)

        terminal_mode = opt.get("terminal", False)

        if self.docker_mode:
            display = os.environ.get("DISPLAY", ":0")
            docker_base = [
                "docker", "compose", "-f", os.path.expanduser(self.compose_path),
                "run", "--rm", "-d", "-q",
                "-e", f"NETWORK_IF={self.network_if}",
                "-e", f"ROS_MASTER_URI={rm_uri}",
                "-e", f"ROS_IP={ros_ip}",
                "-e", f"DISPLAY={display}",
                "hsrb",
            ]
            if terminal_mode:
                cmd = docker_base + ["wezterm", "start", "--", "bash", "-c", f"{formatted_cmd}; exec bash"]
            else:
                cmd = docker_base + ["bash", "-ic", f"hsrb_mode && {formatted_cmd}"]
        else:
            env["ROS_MASTER_URI"] = rm_uri
            env["ROS_IP"] = ros_ip
            if terminal_mode:
                cmd = ["wezterm", "start", "--", "bash", "-c", f"{formatted_cmd}; exec bash"]
            else:
                cmd = formatted_cmd.split(" ")

        return cmd, env

    def run(self, body, ros_master_uri):
        if "start_time" in body:
            self.command.variables["start_time"]["default"] = body["start_time"]

        cmd, my_env = self.build_cmd(self.command.template, ros_master_uri, body)

        if self.proc is not None:
            if self.proc.poll() is None:
                logger.warning(f"[{self.node_name}] already running")
                return None
            else:
                self.proc = None

        t = time.localtime()
        txt_name = "{}_{}_{}_{}_{}_{}_{}.log.txt".format(self.node_name, t.tm_year,
                                                         t.tm_mon, t.tm_mday, t.tm_hour,
                                                         t.tm_min, t.tm_sec)

        # check log dir is exists
        home_dir = os.path.expanduser("~")
        erasers_log_dir = os.path.join(home_dir, '.erasers_log')

        if not os.path.exists(erasers_log_dir):
            os.mkdir(erasers_log_dir)
            logger.debug(f"ログディレクトリ作成: {erasers_log_dir}")

        self.log_file_name = os.path.join(erasers_log_dir, txt_name)
        self.log_file = open(self.log_file_name, "w")
        logger.info(f"[{self.node_name}] $ {' '.join(cmd)}")

        if self.docker_mode:
            # Run detached and capture container ID from stdout
            result = subprocess.run(cmd, capture_output=True, text=True)
            self.container_id = result.stdout.strip()
            logger.info(f"[{self.node_name}] container id: {self.container_id}")
            # Follow container logs; proc exits when container stops
            self.proc = subprocess.Popen(
                ["docker", "logs", "-f", self.container_id],
                stdout=self.log_file, stderr=subprocess.STDOUT
            )
        else:
            self.proc = subprocess.Popen(cmd, stdout=self.log_file, stderr=subprocess.STDOUT, env=my_env)

        return self.proc

    def kill(self):
        if self.docker_mode and self.container_id:
            logger.info(f"[{self.node_name}] docker stop {self.container_id}")
            subprocess.run(["docker", "stop", self.container_id], check=False)
            self.container_id = None

        if self.proc is not None:
            self.proc.terminate()

        if self.command.kill != "":
            cmd = self.command.kill.split()
            logger.info(f"[{self.node_name}] $ {' '.join(cmd)}")
            subprocess.Popen(cmd)

        self.proc = None

    def get_log_file_path(self):
        return self.log_file_name

    def get_exit_code(self):
        if self.proc is None:
            return None
        return self.proc.poll()

    def is_running(self):
        if self.proc is not None:
            return self.proc.poll() is None
        else:
            return False

class TaskData:
    def __init__(self, path, docker_mode=False, network_if="wlo1", compose_path=""):

        config = self._load_lua(path)

        self.task_name = config["task"]["task_name"]
        self.display_name = config["task"]["display_name"]
        self.description = config["task"]["description"]
        self.programs = {}

        self.config = config

        for node in config["programs"]:
            node_data = NodeData()
            node_data.node_name = node
            node_data.display_name = config["programs"][node]["display_name"]
            node_data.description = config["programs"][node]["description"]
            node_data.command.template = config["programs"][node]["command"]["template"]
            node_data.command.kill = config["programs"][node]["command"]["kill"]
            node_data.command.variables = config["programs"][node]["command"]["variables"]
            node_data.docker_mode = docker_mode
            node_data.network_if = network_if
            node_data.compose_path = compose_path

            self.programs[node] = node_data

    def to_json(self):
        # json_format = json.dumps(self.yaml)
        # return json_format
        return self.config

    def _load_lua(self, path):
        lua = LuaRuntime(unpack_returned_tuples=True)
        result = lua.eval(f'(function() return dofile("{path}") end)()')
        return self._lua_to_dict(result)

    def _lua_to_dict(self, obj):
        """Recursively convert a lupa LuaTable to Python dict/list/primitive."""
        if obj is None:
            return None
        if hasattr(obj, 'items'):
            keys = list(obj.keys())
            if keys and all(isinstance(k, int) for k in keys):
                return [self._lua_to_dict(obj[k]) for k in sorted(keys)]
            else:
                return {str(k): self._lua_to_dict(v) for k, v in obj.items() if k != 'layout'}
        return obj

if __name__ == "__main__":

    task_data = TaskData(os.path.expanduser("~/erasers_ws/wezterm/tasks/tidyup.lua"))
    # print(task_data.task_name)
    print(task_data.programs["yolo"].command.template)
    print(task_data.to_json())
