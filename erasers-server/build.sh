#!/bin/bash

BUILD_FOLDER="build"

if [ ! -d "$BUILD_FOLDER" ]; then
    mkdir "$BUILD_FOLDER"
fi

cd "$BUILD_FOLDER"
pyinstaller ../erasers_task_controller_server.py --onefile --icon taskstarter.ico --name erasers-task-controller

sudo cp ../taskstarter.png /usr/share/pixmaps/
sudo cp ../task-starter.desktop /usr/share/applications/
sudo cp dist/erasers-task-controller /usr/local/bin/
