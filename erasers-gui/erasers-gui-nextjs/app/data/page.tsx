'use client'

import { useEffect, useState } from 'react';
import { Container, Typography, Card, CardContent, Box, CardActions, Button, Grid } from '@mui/material';
import BasicSpeedDial from '../_components/speeddial';

import ROSLIB from 'roslib'
import { RosInterface } from '../scripts/ros'

// const hostNname = "localhost"
const hostNname = process.env.NEXT_PUBLIC_MASTER_HOSTNAME
console.log("get from env-> ", process.env.NEXT_PUBLIC_MASTER_HOSTNAME)

export default function DataViewer() {

    const msg = { "batteryState": null, "jointState": null, "pose2D": null, "wristWrench": null }
    const buttonState = { "batteryState": false, "jointState": false, "pose2D": false, "wristWrench": false }
    const [jointState, setJointState] = useState(msg);
    const [stopData, setStopData] = useState(buttonState);

    useEffect(() => {
        const ros_interface = new RosInterface(hostNname)

        const batteryStateSub = new ROSLIB.Topic({ ros: ros_interface.ros, name: '/hsrb/battery_states', messageType: 'tmc_msgs/BatteryState' });
        batteryStateSub.subscribe(message => {
            const header = message.header;
            if (stopData["batteryState"] != true) {
                var element = (
                    <>
                        <h2>/hsrb/battery_states</h2>
                        <div>
                            {JSON.stringify(message)}
                        </div>
                    </>
                )
                jointState["batteryState"] = element;
                setJointState({ ...jointState });
            }
        })

        const jointStatesSub = new ROSLIB.Topic({ ros: ros_interface.ros, name: '/hsrb/joint_states', messageType: 'sensor_msgs/JointState' });
        jointStatesSub.subscribe(message => {
            const header = message.header;
            const name = message.name;
            const position = message.position;
            const velocity = message.velocity;
            const effort = message.effort;
            if (stopData["jointState"] != true) {
                var element = (
                    <>
                        <h2>/hsrb/joint_states</h2>
                        {name.map((_, index) => (
                            <div key={index}>
                                {name[index]}: {Math.round(position[index] * 1) / 1}, {Math.round(velocity[index] * 1) / 1}, {Math.round(effort[index] * 1) / 1}
                            </div>
                        ))}
                    </>
                )
                jointState["jointState"] = element;
                setJointState({ ...jointState });
            }
        })

        const pose2DSub = new ROSLIB.Topic({ ros: ros_interface.ros, name: '/hsrb/pose2D', messageType: 'geometry_msgs/Pose2D' });
        pose2DSub.subscribe(message => {
            if (stopData["pose2D"] != true) {
                var element = (
                    <>
                        <h2>/hsrb/pose2D</h2>
                        <div>
                            X: {message.x}
                        </div>
                        <div>
                            y: {message.y}
                        </div>
                        <div>
                            theta: {message.theta}
                        </div>
                    </>
                )
                jointState["pose2D"] = element;
                setJointState({ ...jointState });
            }
        })
        const wristWrenchSub = new ROSLIB.Topic({ ros: ros_interface.ros, name: '/hsrb/wrist_wrench/raw', messageType: 'geometry_msgs/WrenchStamped' });
        wristWrenchSub.subscribe(message => {
            const header = message.header;
            const data = message.wrench;
            if (stopData["wristWrench"] != true) {
                var element = (
                    <>
                        <h2>/hsrb/wrist_wrench/raw</h2>
                        <div>
                            <div>
                                <h3>Force</h3>
                                <div>X: {data.force.x}</div>
                                <div>Y: {data.force.y}</div>
                                <div>Z: {data.force.z}</div>
                            </div>
                            <div>
                                <h3>Torque</h3>
                                <div>X: {data.torque.x}</div>
                                <div>Y: {data.torque.y}</div>
                                <div>Z: {data.torque.z}</div>
                            </div>                            
                        </div>
                    </>
                )
                jointState["wristWrench"] = element;
                setJointState({ ...jointState });
            }
        })

        return () => {
            batteryStateSub.unsubscribe();
            jointStatesSub.unsubscribe();
            pose2DSub.unsubscribe();
            wristWrenchSub.unsubscribe();
        };

    }, []);

    const stopDataFunc = (b, k) => {
        stopData[k] = b;
        setStopData(stopData);
    };

    return (
        <>
            <Box sx={{ width: "100%", height: "100%" }}>
                <Typography variant="h3" sx={{ m: 2 }}>Data Viewer</Typography>
                <hr />
                <Grid container spacing={0} columns={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                    {Object.keys(jointState).map((key, index) => (
                        <Grid key={index}>
                            <Card sx={{ width: "500px", height: "400px", m: 1, position: 'relative' }}>
                                <Box sx={{ overflow: "auto", maxHeight: "85%" }}>
                                    <CardContent>
                                        <Typography sx={{ fontSize: 14 }} color="text.secondary">
                                            {jointState[key]}
                                        </Typography>
                                    </CardContent>
                                </Box>
                                <CardActions sx={{ position: "absolute", bottom: 0, right: 0 }}>
                                    <Button size="small">COPY</Button>
                                    <Button size='small'>Raw Data</Button>
                                    {stopData[key]
                                        ? <Button size="small" onClick={() => stopDataFunc(false, key)}>RUN</Button>
                                        : <Button size="small" onClick={() => stopDataFunc(true, key)}>STOP</Button>
                                    }
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
                <BasicSpeedDial />
            </Box >
        </>
    );
}