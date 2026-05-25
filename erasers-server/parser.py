#!/usr/bin/env python3

import time
import os
import sys
import subprocess
import signal
import logging
import json
import socket
import fcntl
import struct

from lupa import LuaRuntime

logger = logging.getLogger('erasers')

ROS_URI_MAP = {"hsrb80": "192.168.11.80", "hsrb33": "192.168.11.33", "localhost": "localhost"}


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
    class Command:
        template = ""
        kill = ""
        variables = {}

    def __init__(self):
        self.node_name = ""
        self.display_name = ""
        self.description = ""
        self.commands = {}        # { key: Command }
        self.default_command = "default"
        self.active_command_key = None

        self.proc = None
        self.log_file = None
        self.log_file_name = None

        self.network_if = "wlo1"

    def get_command(self, key=None):
        k = key or self.default_command
        return self.commands.get(k) or next(iter(self.commands.values()), None)

    def build_cmd(self, template, ros_master_uri, opt):
        logger.debug(f"build_cmd: template={template!r}, ros_master_uri={ros_master_uri}, opt={opt}")

        host = ROS_URI_MAP.get(ros_master_uri, ros_master_uri)
        rm_uri = "http://{}:11311".format(host)
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"

        formatted_cmd = template
        for key, value in opt.items():
            formatted_cmd = formatted_cmd.replace(f'${{{key}}}', str(value))

        ros_ip = get_ip_address(self.network_if)
        terminal_mode = opt.get("terminal", False)

        env["ROS_MASTER_URI"] = rm_uri
        env["ROS_IP"] = ros_ip
        if terminal_mode:
            cmd = ["wezterm", "start", "--", "bash", "-c", f"{formatted_cmd}; exec bash"]
        else:
            cmd = formatted_cmd.split(" ")

        return cmd, env

    def run(self, body, ros_master_uri):
        command_key = body.get("__command_key__")
        cmd_obj = self.get_command(command_key)
        self.active_command_key = command_key or self.default_command

        if "start_time" in body and "start_time" in cmd_obj.variables:
            cmd_obj.variables["start_time"]["default"] = body["start_time"]

        template = body.get("__command_template__", cmd_obj.template)
        clean_body = {k: v for k, v in body.items()
                      if k not in ("__command_template__", "__command_key__")}
        cmd, my_env = self.build_cmd(template, ros_master_uri, clean_body)

        if self.proc is not None:
            if self.proc.poll() is None:
                logger.warning(f"[{self.node_name}] already running")
                return None
            else:
                self.proc = None

        t = time.localtime()
        txt_name = "{}_{}_{}_{}_{}_{}_{}.log.txt".format(
            self.node_name, t.tm_year, t.tm_mon, t.tm_mday, t.tm_hour, t.tm_min, t.tm_sec
        )

        home_dir = os.path.expanduser("~")
        erasers_log_dir = os.path.join(home_dir, '.erasers_log')

        if not os.path.exists(erasers_log_dir):
            os.mkdir(erasers_log_dir)
            logger.debug(f"ログディレクトリ作成: {erasers_log_dir}")

        self.log_file_name = os.path.join(erasers_log_dir, txt_name)
        self.log_file = open(self.log_file_name, "w")
        logger.info(f"[{self.node_name}] $ {' '.join(cmd)}")

        self.proc = subprocess.Popen(
            " ".join(cmd),
            stdout=self.log_file,
            stderr=subprocess.STDOUT,
            env=my_env,
            shell=True,
            start_new_session=True,
        )

        return self.proc

    def kill(self):
        if self.proc is not None:
            self.proc.terminate()
            if self.proc.poll() is None:
                print('Terminating process group...')
                try:
                    os.killpg(os.getpgid(self.proc.pid), signal.SIGTERM)
                    self.proc.wait(timeout=1)
                except subprocess.TimeoutExpired:
                    os.killpg(os.getpgid(self.proc.pid), signal.SIGKILL)
                    self.proc.wait()
                except ProcessLookupError:
                    pass

        cmd_obj = self.commands.get(self.active_command_key or self.default_command)
        if cmd_obj and cmd_obj.kill != "":
            logger.info(f"[{self.node_name}] $ {cmd_obj.kill}")
            subprocess.Popen(cmd_obj.kill, shell=True)

        self.proc = None

    def get_log_file_path(self):
        return self.log_file_name

    def get_exit_code(self):
        if self.proc is None:
            return None
        return self.proc.poll()

    def is_running(self):
        return self.proc is not None and self.proc.poll() is None


class TaskData:
    def __init__(self, path, network_if="wlo1"):
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
            node_data.network_if = network_if

            raw_cmds = config["programs"][node]["commands"]
            node_data.default_command = config["programs"][node].get("default_command") or next(iter(raw_cmds))
            for key, raw_cmd in raw_cmds.items():
                c = NodeData.Command()
                c.template  = raw_cmd["template"]
                c.kill      = raw_cmd["kill"]
                c.variables = raw_cmd["variables"]
                node_data.commands[key] = c

            self.programs[node] = node_data

    def to_json(self):
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
    print(task_data.programs["yolo"].get_command().template)
    print(task_data.to_json())
