'use client'

import Header from "../_components/header"
import Footer from "../_components/footer"
import { use, useEffect, useState } from 'react'

import {
  Box,
  Link,
  Grid,
  Card,
  Button,
  Tabs,
  Tab,
  Typography,
  Checkbox,
  FormControlLabel,
  LinearProgress,
} from '@mui/material';

import OptionVariables from "./_components/optionvariablesparser";
import LogModal from "./_components/LogModal";
import BasicSpeedDial from "../_components/speeddial";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`, 'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default function Dashboard() {

  const getTask = async () => {
    const response = await fetch("http://localhost:3001/get_task", { cache: 'no-store' });
    const tasks = await response.json();
    console.log(tasks);
    return tasks;
  };

  const getTaskRunning = async (taskName: string, nodeName: string) => {
    const response = await fetch(`http://localhost:3001/task_running/${taskName}/${nodeName}`, { cache: 'no-store' });
    const is_running = await response.json();
    return is_running
  }

  // RUN NODE
  const getNowUnixTIme = () => {
    const localDate = new Date();
    const unixTime = Math.floor(localDate.getTime() / 1000); // ミリ秒から秒に変換
    console.log('now time is -> ', unixTime)
    return unixTime;
  };

  const [runStatus, setRunStatus] = useState(null);
  const handleRunButtonClick = async (taskName, nodeName, debug, option) => {
    console.log(`RUN button clicked for ${nodeName}`, " -> with openion | ", option[taskName][nodeName]);

    var _body = { "debug": debug };
    const defaultop = taskData[taskName].programs[nodeName].command.variables;
    const setedop = option[taskName][nodeName]
    if (setedop != undefined) {
      for (const key of Object.keys(setedop)) {
        if (setedop[key] != undefined) {
          if (defaultop[key].type == 'unixtime') {
            const startTime = getNowUnixTIme();
            _body[key] = startTime;
            optionVariables[taskName][nodeName][key] = startTime;
          } else {
            _body[key] = setedop[key];
          }
        }
      }
    }

    const response = await fetch(`http://localhost:3001/run_task/${taskName}/${nodeName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(_body),
    });

    if (response.ok) {
      console.log(`Run request for ${nodeName} successful`);
      var run_status = runStatus;
      run_status[taskName][nodeName] = true;
      setRunStatus({ ...run_status });
    } else {
      console.error(`Failed to run task for ${nodeName}`);
    }
  };

  // KILL NODE
  const handleKillButtonClick = async (taskName, nodeName) => {
    console.log(`KILL button clicked for ${nodeName}`);
    const response = await fetch(`http://localhost:3001/kill_task/${taskName}/${nodeName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      console.log(`Run request for ${nodeName} successful`);
      var run_status = runStatus;
      run_status[taskName][nodeName] = false;
      setRunStatus({ ...run_status });
    } else {
      console.error(`Failed to run task for ${nodeName}`);
    }
  };

  // SHOW LOG
  const [openLogModal, setOpenLogModal] = useState([]);
  const handleGetLogButtonClick = (taskName, nodeName) => {
    setOpenLogModal([taskName, nodeName])
  }

  // CONTROL DEBUG OPTION
  const [debugChecked, setDebugChecked] = useState(null);
  const handleChangeDebug = (event, task_index, node_index) => {
    var copy = debugChecked;
    copy[task_index][node_index] = event.target.checked
    setDebugChecked([...copy])
  }

  const [taskData, setTaskData] = useState();
  useEffect(() => {
    //const _ts = getTask();
    getTask().then(tsData => {
      // setTaskData(tsData)

      // set checkbox state
      var checkboxLength = []
      for (var task_k in tsData) {
        var L: boolean[] = []
        for (var i = 0; i < Object.keys(tsData[task_k].programs).length; i++) {
          L.push(false);
        }
        checkboxLength.push(L)
      }
      setDebugChecked(checkboxLength);

      const fetchTaskStatus = async () => {
        var runStatusDict = {};
        for (var task_k in tsData) {
          var K = {}
          for (var node_k in tsData[task_k].programs) {
            const res = await getTaskRunning(task_k, node_k)
            console.log('hogehogehoge-> ', task_k, node_k, res.is_running)
            // get task start time
            /*
            if ("start_time" in res) {
              console.log('have start time-> ', res.start_time.default)
              // tsData[task_k].programs[node_k].command.variables["start_time"].default = 10000;
              tsData[task_k].programs[node_k].command.variables["start_time"].default = res.start_time.default;
            }
            */
            ///////////////////////
            K[node_k] = res.is_running;
          }
          runStatusDict[task_k] = K;
        }
        setRunStatus({ ...runStatusDict });
      }

      fetchTaskStatus();
      setTaskData(tsData)

    });

  }, []);


  const [tabValue, setTabValue] = useState(0);
  const handleChangeTaskTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const [optionVariables, setOptionVariable] = useState({});

  console.log(" ================= render menu ========================")

  return (
    <>
      <LogModal openModal={openLogModal} />

      <Box sx={{ width: '100%', height: '100%' }}>
        <Typography variant="h3" sx={{ m: 2 }}>Task Starter</Typography>
        <br />
        {taskData && debugChecked && runStatus && Object.keys(taskData).length > 0 ? (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleChangeTaskTab} aria-label="basic tabs example">
                {
                  Object.keys(taskData).map((task_key, task_index) => (
                    <Tab label={taskData[task_key].task.display_name} {...a11yProps(task_index)} key={task_index} />
                  ))
                }
              </Tabs>
            </Box>
            {
              Object.keys(taskData).map((task_key, task_index) => (
                <CustomTabPanel value={tabValue} index={task_index} key={task_index}>
                  <Box>
                    <Typography variant="h4" sx={{ marginBottom: 2 }}>
                      {taskData[task_key].task.description}
                    </Typography>

                    <Box>
                      <Button variant='outlined' sx={{ marginBottom: 2, marginRight: 2 }}>
                        <Typography sx={{ fontSize: 'h6.fontSize' }}>RUN ALL NODE</Typography>
                      </Button>
                      <Button variant='outlined' sx={{ marginBottom: 2 }}>
                        <Typography sx={{ fontSize: 'h6.fontSize' }}>KILL ALL NODE</Typography>
                      </Button>
                    </Box>

                    {Object.keys(taskData[task_key].programs).map((node_key, node_index) => (
                      <Box key={node_index} sx={{ m: 1, p: 2 }}>
                        <Typography variant="h5">{taskData[task_key].programs[node_key].display_name}</Typography>
                        <Typography variant="h6">{taskData[task_key].programs[node_key].description}</Typography>
                        <Typography variant="h6">$ {taskData[task_key].programs[node_key].command.template}</Typography>

                        <Box>
                          {Object.keys(taskData[task_key].programs[node_key].command.variables).length > 0 && (
                            Object.keys(taskData[task_key].programs[node_key].command.variables).map((opt_key, opt_index) => (
                              <div key={opt_index}>
                                <OptionVariables
                                  task_key={task_key}
                                  node_key={node_key}
                                  opt_key={opt_key}
                                  index={opt_index}
                                  default_variables={taskData[task_key].programs[node_key].command.variables}
                                  setFunc={setOptionVariable}
                                  optionVariables={optionVariables}
                                  nodeRunStatus={runStatus}
                                />
                              </div>
                            ))
                          )}
                        </Box>
                        <FormControlLabel
                          key={node_key}
                          label="Debug"
                          control={<Checkbox checked={debugChecked[task_index][node_index]} onChange={(e) => { handleChangeDebug(event, task_index, node_index) }} />}
                        />
                        <Button onClick={() => handleRunButtonClick(task_key, node_key, debugChecked[task_index][node_index], optionVariables)}>
                          RUN
                        </Button>
                        <Button onClick={() => handleKillButtonClick(task_key, node_key)}>
                          KILL
                        </Button>
                        <Button onClick={() => handleGetLogButtonClick(task_key, node_key)}>
                          LOG
                        </Button>
                        {
                          runStatus && runStatus[task_key][node_key] == true && (
                            // runStatus != undefined && (
                            <Box sx={{ width: '100%' }}>
                              <LinearProgress />
                            </Box>
                          )
                        }
                        <hr />
                      </Box>
                    ))}
                  </Box>
                </CustomTabPanel>
              ))
            }
          </>
        ) : (
          <Box>
            <p>No task data found. Please check task controller running</p>
          </Box>
        )}
        <BasicSpeedDial />
      </Box>
    </>
  );
}
