#!/usr/bin/env python3

import time
import os
import sys
import subprocess

import yaml
import json

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

    def build_cmd(self, template, ros_master_uri, opt):
        print("-"*100)
        print(template)
        print(ros_master_uri)
        print(opt)
        print("-"*100)

        # settings for ros master uri
        uri = {"hsrb80": "192.168.11.80", "hsrb33": "192.168.11.33", "localhost": "localhost"}
        rm_uri = "http://{}:11311".format(uri[ros_master_uri])
        env = os.environ.copy()
        env["ROS_MASTER_URI"] = rm_uri

        # settings for option
        formatted_cmd = template
        for key, value in opt.items():
            formatted_cmd = formatted_cmd.replace(f'${{{key}}}', str(value))

        # cmd = rm_uri + " " + formatted_cmd
        cmd = formatted_cmd.split(" ")
        
        # cmd = ["python3", "-u", "sample_not_ros.py"]
        return cmd, env

    def run(self, body, ros_master_uri):
        print("running with option arguments -> ", body)
        print("running with ROS_MASTER_URI -> ", ros_master_uri)

        if "start_time" in body:
            self.command.variables["start_time"]["default"] = body["start_time"]

        cmd, my_env = self.build_cmd(self.command.template, ros_master_uri, body)

        if self.proc is not None:
            print("already running")
            return None

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
        # self.proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        self.proc = subprocess.Popen(cmd, stdout=self.log_file, stderr=subprocess.STDOUT, env=my_env)

        return self.proc

    def kill(self):
        res = self.proc.terminate()
        if self.command.kill != "":
            print("kill program with special command", self.command.kill)
            cmd = self.command.kill.split()
            subprocess.Popen(cmd)
        
        # res = self.proc.kill()
        self.proc = None

        return res

    def get_log_file_path(self):
        return self.log_file_name

    def is_running(self):
        if self.proc is not None:
            return self.proc.poll() is None
        else:
          return False
  
        # return self.proc.poll() is None

class TaskData:
    def __init__(self, path):

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
