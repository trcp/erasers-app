import React, { useState, useEffect } from 'react';
import { Box, Button, Typography } from "@mui/material";

import ROSLIB from 'roslib'
import { useRos } from '~/scripts/ros'

const getNowUnixTime = () => {
    const localDate = new Date();
    const unixTime = Math.floor(localDate.getTime() / 1000);
    console.log('now time is -> ', unixTime)
    return unixTime;
};

export default function TaskTimer({ defaultDuration, optionVariables, task_key, node_key, opt_key, setOptionFunc, nodeRunStatus }) {

    const { ros } = useRos();
    const [timerActive, setTimerIsActive] = useState(false);
    useEffect(() => {
        if (!ros) return;
        const startTimeSub = new ROSLIB.Topic({ ros, name: '/task_time', messageType: 'std_msgs/Time' });

        startTimeSub.subscribe(message => {
            console.log("start time is ", message.data)
            optionVariables[task_key][node_key]["start_time"] = message.data.secs;
            setOptionFunc({ ...optionVariables });
            setTimerIsActive(true);
            fetch(`http://localhost:3001/set_time/${task_key}/${node_key}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                },
                body: message.data.secs,
            });
        })
        return () => {
            startTimeSub.unsubscribe();
        };
    }, [ros])

    const isActive = nodeRunStatus[task_key][node_key];

    const resetTimer = () => {
        console.log("reset pushed")
        optionVariables[task_key][node_key][opt_key] = defaultDuration;
        setOptionFunc({ ...optionVariables });
        setRemainTime(defaultDuration);
    };

    const adjustTime = (amount) => {
        var prev_seconds = optionVariables[task_key][node_key][opt_key];
        optionVariables[task_key][node_key][opt_key] = prev_seconds + amount;
        setOptionFunc({ ...optionVariables });
        setRemainTime(prev_seconds + amount);
    };

    const [remainTime, setRemainTime] = useState(optionVariables[task_key][node_key][opt_key]);

    useEffect(() => {
        let intervalId;

        console.log("timer active", optionVariables[task_key][node_key][opt_key], opt_key)

        intervalId = setInterval(() => {
            console.log("interval id", intervalId);
            if (optionVariables[task_key][node_key]["start_time"] != -1) {
                var remain_time = optionVariables[task_key][node_key][opt_key] - (getNowUnixTime() - optionVariables[task_key][node_key]["start_time"])
                console.log("remaining time is -> ", remain_time)
                setRemainTime(remain_time);
            }
            else {
                clearInterval(intervalId);
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [isActive]);

    return (
        <Box sx={{ p: 0.5 }}>
            <Box>
                <Typography variant="h6">
                    Timer: {String(Math.floor(remainTime / 60)).padStart(2, '0')}:{String(remainTime % 60).padStart(2, '0')}
                </Typography>
            </Box>
            <Box sx={{ marginTop: 1, display: 'flex', gap: 1 }}>
                <Button size="small" onClick={resetTimer} disabled={isActive} variant="outlined">
                    Default
                </Button>
                <Button size="small" onClick={() => adjustTime(60)} disabled={isActive} variant="outlined">
                    +1m
                </Button>
                <Button size="small" onClick={() => adjustTime(-60)} disabled={isActive} variant="outlined">
                    -1m
                </Button>
                <Button size="small" onClick={() => adjustTime(10)} disabled={isActive} variant="outlined">
                    +10s
                </Button>
                <Button size="small" onClick={() => adjustTime(-10)} disabled={isActive} variant="outlined">
                    -10s
                </Button>
            </Box>
        </Box>
    );
};
