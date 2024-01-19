import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Grid } from "@mui/material";

const getNowUnixTIme = () => {
  const localDate = new Date();
  const unixTime = Math.floor(localDate.getTime() / 1000); // ミリ秒から秒に変換
  console.log('now time is -> ', unixTime)
  return unixTime;
};

export default function TaskTimer({ defaultDuration, optionVariables, task_key, node_key, opt_key, setOptionFunc, nodeRunStatus }) {
  
  console.log("noderunstatus-> ", nodeRunStatus);
  const isActive = nodeRunStatus[task_key][node_key];

  const startTimer = () => {

  };

  const resetTimer = () => {
    optionVariables[task_key][node_key][opt_key] = defaultDuration;
    setOptionFunc({ ...optionVariables });
  };

  const adjustTime = (amount) => {
    var prev_seconds = optionVariables[task_key][node_key][opt_key];
    optionVariables[task_key][node_key][opt_key] = prev_seconds + amount;
    setOptionFunc({ ...optionVariables });
  };

  const minutes = Math.floor(optionVariables[task_key][node_key][opt_key] / 60);
  const seconds = optionVariables[task_key][node_key][opt_key] % 60;

  useEffect(() => {
    let intervalId;

    if (isActive) {
      // calc resume timer
      var diff = getNowUnixTIme() - optionVariables[task_key][node_key]["start_time"]
      var prev_seconds = optionVariables[task_key][node_key][opt_key]
      optionVariables[task_key][node_key][opt_key] = prev_seconds - diff;
      setOptionFunc({ ...optionVariables })

      intervalId = setInterval(() => {
        var prev_seconds = optionVariables[task_key][node_key][opt_key]
        optionVariables[task_key][node_key][opt_key] = prev_seconds - 1;
        setOptionFunc({ ...optionVariables })
      }, 1000);
    }

    return () => clearInterval(intervalId);
  }, [isActive]);


  return (
    <Box sx={{ bgcolor: 'background.default', p: 3, borderRadius: 4, boxShadow: 1 }}>

      <Box>
        <Typography variant="h5">
          Timer: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
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