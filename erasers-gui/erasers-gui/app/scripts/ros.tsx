import ROSLIB from 'roslib'

export class RosInterface {
    ros = null
    constructor(hostName: string) {
        var url = `ws://${hostName}:9090`
        console.log(url)
        
        this.ros = new ROSLIB.Ros({
            url: url
        });

        this.ros.on('connection', function () {
            console.log('Connected to websocket server.');
            //build_subscriber()
        });

        var that = this;
        this.ros.on('error', function (error) {
            console.log('Error connecting to websocket server: ', error);
            that.ros.connect(url)
        });

        this.ros.on('close', function () {
            console.log('Connection to websocket server closed.');
            that.ros.connect(url)
        });
    }
}