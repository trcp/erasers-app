'use client'

import { useEffect, useState } from 'react';
import { Container, Typography, Card, CardContent, Box, CardActions, Button, Grid, TextField } from '@mui/material';
import BasicSpeedDial from '../_components/speeddial';

import ROSLIB from 'roslib'
import { RosInterface } from '../scripts/ros'

// const hostNname = "localhost"
const hostNname = process.env.NEXT_PUBLIC_MASTER_HOSTNAME
console.log("get from env-> ", process.env.NEXT_PUBLIC_MASTER_HOSTNAME)

const TField = ({ data, allKeys = [] }) => {

    const packData = (e, k) => {
        data[k] = Number(e.target.value);
    };

    return (
        <>
            {Object.keys(data).map((k, ind) => {
                if (k !== 'header') {
                    if (typeof data[k] === 'object') {
                        return (
                            <Box key={ind}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', marginBottom: '4px' }}>{k}</Typography>
                                <TField data={data[k]} allKeys={[...allKeys, k]} />
                            </Box>
                        );
                    } else {
                        return (
                            <Box key={ind} style={{ marginBottom: '8px' }}>
                                <Box sx={{display: "flex"}}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', marginRight: '4px', pr:2 }}>{k}:</Typography>
                                    <TextField onChange={(e) => packData(e, k)} variant="outlined" size="small" defaultValue={data[k]}/>
                                </Box>
                            </Box>
                        );
                    }
                }
                return null;
            })}
        </>
    );
};

const CardTemplate = ({ msg, pubFunc }) => {
    const pubMsg = (m) => {
        console.log(m);
        pubFunc.publish(m);
    };

    return (
        <Card sx={{ width: '500px', height: '400px', margin: '8px', position: 'relative', backgroundColor: '#f0f0f0' }}>
            <Box sx={{ overflow: 'auto', maxHeight: '85%' }}>
                <CardContent>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '14px', marginBottom: '8px' }}>
                        {pubFunc.name} : {pubFunc.messageType}
                    </Typography>
                    <Box>
                        <TField data={msg} />
                    </Box>
                </CardContent>
            </Box>
            <CardActions sx={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#f0f0f0' }}>
                <Button size="small" variant="contained" sx={{ marginRight: '8px' }}>Reset</Button>
                <Button size="small" variant="contained" onClick={() => pubMsg(msg)}>Publish</Button>
            </CardActions>
        </Card>
    );
};


export default function DataViewer() {

    const ros_interface = new RosInterface(hostNname)
    const cmdVel = new ROSLIB.Topic({ ros: ros_interface.ros, name: '/hsrb/command_velocity', messageType: 'geometry_msgs/Twist' })
    const nav2d = new ROSLIB.Topic({ ros: ros_interface.ros, name: '/goal', messageType: 'geometry_msgs/PoseStamped' })
    const ttsus = new ROSLIB.Topic({ ros: ros_interface.ros, name: '/talk_request', messageType: 'tmc_msgs/Voice' })

    const twist = new ROSLIB.Message({
        linear: { x: 0.0, y: 0.0, z: 0.0 },
        angular: { x: 0.0, y: 0.0, z: 0.0 }
    });
    const pose_stamped = new ROSLIB.Message({
        header: {
            seq: 0,
            stamp: { sec: 0, nsec: 0 },
            frame_id: "map"
        },
        pose: {
            position: { x: 0.0, y: 0.0, z: 0.0 },
            orientation: { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }
        }
    });

    const voice = new ROSLIB.Message({
        interrupting: false,
        queueing: false,
        language: 0,
        sentence: 'hello'
    })


    // cmdVel.publish(twist);

    return (
        <>
            <Box sx={{ width: "100%", height: "100%" }}>
                <Typography variant="h3" sx={{ m: 2 }}>Robot Controller</Typography>
                <hr />
                <Grid container spacing={1} columns={4} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Grid>
                        <CardTemplate msg={twist} pubFunc={cmdVel} />
                    </Grid>
                    <Grid>
                        <CardTemplate msg={pose_stamped} pubFunc={nav2d} />
                    </Grid>
                    <Grid>
                        <CardTemplate msg={voice} pubFunc={ttsus} />
                    </Grid>                    

                </Grid>
                <BasicSpeedDial />
            </Box >
        </>
    );
}