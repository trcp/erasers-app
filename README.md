# eR@sers GUI
This is a web-based robot management and data visualization tool.

## Installation
### Robot
```bash
$ ssh administrator@hsrb.local
$ git clone https://github.com/trcp/erasers-app.git
$ cd ~/erasers-app/erasers-gui && ./build.sh
$ sudo cp ~/erasers-app/erasers-gui/erasers.gui.service /etc/systemd/system
$ sudo systemctl enable erasers.gui.service
```
Automatically launch chromium gui when the HSR is powerd on. 
1. Search for the Startup Application.
![IMG20230626213206](https://github.com/ry0hei-kobayashi/erasers-app-v2/assets/110576744/a470643d-6770-41b9-b0e2-43b2f2d1d745)

2. Add config for erasers-gui following below.
![IMG20230626213223](https://github.com/ry0hei-kobayashi/erasers-app-v2/assets/110576744/876b2456-0e94-43ef-bc42-d0a3cfd8a9a6)

Fill the below command in "Command(M)".  
```bash
/usr/bin/chromium-browser --password-store=basic --kiosk --incognito --disable-translate --disable-translate-new-ux -disk-cache-size=1 -media-cache-size=1 http://localhost:3000
```
3. Remove the Check mark to prevent Toyota UI from starting automatically.
![IMG20230626213217](https://github.com/ry0hei-kobayashi/erasers-app-v2/assets/110576744/873dadde-3b1f-4fa5-97e6-1ef08e0fd4f0)



### Client PC
```bash
$ pip install pyinstaller
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
  
