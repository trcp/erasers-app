# eR@sers GUI
This is a web-based robot management and data visualization tool.

## Installation
### Robot
```bash
$ ssh administrator@hsrb.local
$ git clone https://github.com/trcp/erasers-app.git
$ cd ~/erasers-app/erasers-gui
$ ./build.sh
$ cp erasers-app/erasers-gui/erasers.gui.service /etc/systemd/system
$ sudo systemctl enable erasers.gui.service
```

### Client PC
```bash
$ git clone https://github.com/trcp/erasers-app.git
$ cd erasers-app/erasers-server/ && ./build.sh
```
## How to use
If connected to the same network as the robot, you can access it by hitting the following URL from web browser.  

http://{robot_ip or robot hostname}:3000

- /dashboard  
Task starter.
You need to launch "Task Starter(erasers-server)" in your Client PC
- /data  
Show robot topic data.
- /controller  
Publish data from browser.
- /mapcreator  
create map location data.
