#!/usr/bin/env python3

import time
import os
import sys
import subprocess

import yaml
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
        print("-"*100)
        print(template)
        print(ros_master_uri)
        print(opt)
        print("-"*100)

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

        if self.docker_mode:
            display = os.environ.get("DISPLAY", ":0")
            cmd = [
                "docker", "compose", "-f", os.path.expanduser(self.compose_path),
                "run", "--rm", "-d", "-q",
                "-e", f"NETWORK_IF={self.network_if}",
                "-e", f"ROS_MASTER_URI={rm_uri}",
                "-e", f"ROS_IP={ros_ip}",
                "-e", f"DISPLAY={display}",
                "hsrb",
                "bash", "-ic", f"hsrb_mode && {formatted_cmd}"
            ]
        else:
            env["ROS_MASTER_URI"] = rm_uri
            env["ROS_IP"] = ros_ip
            cmd = formatted_cmd.split(" ")

        return cmd, env

    def run(self, body, ros_master_uri):
        print("running with option arguments -> ", body)
        print("running with ROS_MASTER_URI -> ", ros_master_uri)

        if "start_time" in body:
            print("START_TIME IS IN BODY, ", body["start_time"])
            self.command.variables["start_time"]["default"] = body["start_time"]
            print("START_TIME IS IN BODY, ", self.command.variables["start_time"]["default"])

        cmd, my_env = self.build_cmd(self.command.template, ros_master_uri, body)

        if self.proc is not None:
            if self.proc.poll() is None:
                print("already running")
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
            print(f"Directory '{erasers_log_dir}' created.")
        else:
            print(f"Directory '{erasers_log_dir}' already exists.")
        
        self.log_file_name = os.path.join(erasers_log_dir, txt_name)
        self.log_file = open(self.log_file_name, "w")
        print(f"[run] $ {' '.join(cmd)}")

        if self.docker_mode:
            # Run detached and capture container ID from stdout
            result = subprocess.run(cmd, capture_output=True, text=True)
            self.container_id = result.stdout.strip()
            print(f"[run] container id: {self.container_id}")
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
            print(f"[kill] docker stop {self.container_id}")
            subprocess.run(["docker", "stop", self.container_id], check=False)
            self.container_id = None

        if self.proc is not None:
            self.proc.terminate()

        if self.command.kill != "":
            cmd = self.command.kill.split()
            print(f"[kill] $ {' '.join(cmd)}")
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

        config = self._load_yaml(path)

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

    def _load_yaml(self, path):
        with open(path, mode="r") as f:
            data = yaml.safe_load(f)

        return data

if __name__ == "__main__":

    task_data = TaskData("config/tidyup.yaml")
    # print(task_data.task_name)
    print(task_data.programs["yolo"].command.template)
    print(task_data.to_json())
