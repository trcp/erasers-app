import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Grid } from "@mui/material";

import ROSLIB from 'roslib'
import { RosInterface } from '../../scripts/ros'

const hostNname = process.env.NEXT_PUBLIC_MASTER_HOSTNAME

const getNowUnixTIme = () => {
  const localDate = new Date();
  const unixTime = Math.floor(localDate.getTime() / 1000); // ミリ秒から秒に変換
  console.log('now time is -> ', unixTime)
  return unixTime;
};

export default function TaskTimer({ defaultDuration, optionVariables, task_key, node_key, opt_key, setOptionFunc, nodeRunStatus }) {

    const [timerActive, setTimerIsActive] = useState(false);
    useEffect(() => {
        const ros_interface = new RosInterface(hostNname)
        const startTimeSub = new ROSLIB.Topic({ ros: ros_interface.ros, name: '/task_time', messageType: 'std_msgs/Time' });

        startTimeSub.subscribe(message => {
            console.log("start time is ", message.data)
            optionVariables[task_key][node_key]["start_time"] = message.data.secs;
            setOptionFunc({ ...optionVariables });
            setTimerIsActive(true);
            const response = fetch(`http://localhost:3001/set_time/${task_key}/${node_key}`, {
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
  }, [])
    
  
    // console.log("noderunstatus-> ", nodeRunStatus);
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

  // const minutes = Math.floor(optionVariables[task_key][node_key][opt_key] / 60);
    // const seconds = optionVariables[task_key][node_key][opt_key] % 60;

    const [remainTime, setRemainTime] = useState(optionVariables[task_key][node_key][opt_key]);


  useEffect(() => {
    let intervalId;

          console.log("timer active", optionVariables[task_key][node_key][opt_key], opt_key)
          // calc resume timer
      /* var diff = getNowUnixTIme() - optionVariables[task_key][node_key]["start_time"]
       * var prev_seconds = optionVariables[task_key][node_key][opt_key]
       * optionVariables[task_key][node_key][opt_key] = prev_seconds - diff;
       * setOptionFunc({ ...optionVariables }) */
          
      intervalId = setInterval(() => {
          console.log("interval id", intervalId);
          if (optionVariables[task_key][node_key]["start_time"] != -1) {
              var remain_time = optionVariables[task_key][node_key][opt_key] - (getNowUnixTIme() - optionVariables[task_key][node_key]["start_time"])
              console.log("remaining time is -> ", remain_time)
              // optionVariables[task_key][node_key][opt_key] = remain_time;
              // setOptionFunc({ ...optionVariables })
              setRemainTime(remain_time);
          }
          else {
              clearInterval(intervalId);
          }
      }, 1000);

    return () => clearInterval(intervalId);
  }, [isActive]);


  return (
    <Box sx={{ bgcolor: 'background.default', p: 3, borderRadius: 4, boxShadow: 1 }}>

      <Box>
        <Typography variant="h5">
          Timer: {String(Math.floor(remainTime / 60)).padStart(2, '0')}:{String(remainTime % 60).padStart(2, '0')}
        </Typography>
      </Box>
      <Box sx={{ marginTop: 2 }}>
        <Button onClick={resetTimer} disabled={isActive} variant="outlined" sx={{ marginRight: 2 }}>
          Default
        </Button>
        <Button onClick={() => adjustTime(60)} disabled={isActive} variant="outlined" sx={{ marginRight: 2 }}>
          +1 minute
        </Button>
        <Button onClick={() => adjustTime(-60)} disabled={isActive} variant="outlined" sx={{ marginRight: 2 }}>
          -1 minute
        </Button>
        <Button onClick={() => adjustTime(10)} disabled={isActive} variant="outlined" sx={{ marginRight: 2 }}>
          +10 seconds
        </Button>
        <Button onClick={() => adjustTime(-10)} disabled={isActive} variant="outlined">
          -10 seconds
        </Button>
      </Box>
    </Box>
  );
};
