import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Tabs,
  Tab,
  Typography,
  Checkbox,
  FormControlLabel,
  LinearProgress,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ArticleIcon from '@mui/icons-material/Article';

import OptionVariables from '~/components/dashboard/OptionVariablesParser';
import LogModal from '~/components/dashboard/LogModal';
import AppLayout from '~/components/AppLayout';

const hostName = import.meta.env.VITE_MASTER_HOSTNAME;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return { id: `simple-tab-${index}`, 'aria-controls': `simple-tabpanel-${index}` };
}

export default function TaskStarter() {

  const getTask = async () => {
    const response = await fetch("http://localhost:3001/get_task", { cache: 'no-store' });
    const tasks = await response.json();
    return tasks;
  };

  const getTaskRunning = async (taskName: string, nodeName: string) => {
    const response = await fetch(`http://localhost:3001/task_running/${taskName}/${nodeName}`, { cache: 'no-store' });
    const is_running = await response.json();
    return is_running;
  };

  const [runStatus, setRunStatus] = useState(null);
  const handleRunButtonClick = async (taskName, nodeName, debug, option) => {
    var _body: any = { "debug": debug };
    const defaultop = taskData[taskName].programs[nodeName].command.variables;
    const setedop = option[taskName][nodeName];
    if (setedop != undefined) {
      for (const key of Object.keys(setedop)) {
        if (setedop[key] != undefined) {
          if (defaultop[key].type == 'unixtime') {
            _body[key] = optionVariables[taskName][nodeName][key];
          } else {
            _body[key] = setedop[key];
          }
        }
      }
    }

    const response = await fetch(`http://localhost:3001/run_task/${taskName}/${nodeName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_body),
    });

    if (response.ok) {
      var run_status = runStatus;
      run_status[taskName][nodeName] = true;
      setRunStatus({ ...run_status });
    }
  };

  const handleKillButtonClick = async (taskName, nodeName) => {
    const response = await fetch(`http://localhost:3001/kill_task/${taskName}/${nodeName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      var run_status = runStatus;
      run_status[taskName][nodeName] = false;
      setRunStatus({ ...run_status });
    }
  };

  const [openLogModal, setOpenLogModal] = useState([]);
  const handleGetLogButtonClick = (taskName, nodeName) => {
    setOpenLogModal([taskName, nodeName]);
  };

  const [debugChecked, setDebugChecked] = useState(null);
  const handleChangeDebug = (_event, task_index, node_index) => {
    var copy = debugChecked;
    copy[task_index][node_index] = _event.target.checked;
    setDebugChecked([...copy]);
  };

  const [taskData, setTaskData] = useState<any>();
  useEffect(() => {
    getTask().then(tsData => {
      var checkboxLength: boolean[][] = [];
      for (var task_k in tsData) {
        var L: boolean[] = [];
        for (var i = 0; i < Object.keys(tsData[task_k].programs).length; i++) {
          L.push(false);
        }
        checkboxLength.push(L);
      }
      setDebugChecked(checkboxLength);

      const fetchTaskStatus = async () => {
        var runStatusDict: any = {};
        for (var task_k in tsData) {
          var K: any = {};
          for (var node_k in tsData[task_k].programs) {
            const res = await getTaskRunning(task_k, node_k);
            K[node_k] = res.is_running;
          }
          runStatusDict[task_k] = K;
        }
        setRunStatus({ ...runStatusDict });
      };

      fetchTaskStatus();
      setTaskData(tsData);
    });
  }, []);

  const [tabValue, setTabValue] = useState(0);
  const handleChangeTaskTab = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const [optionVariables, setOptionVariable] = useState({});

  return (
    <AppLayout>
      <LogModal openModal={openLogModal} />

      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1565C0' }}>Task Starter</Typography>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {taskData && debugChecked && runStatus && Object.keys(taskData).length > 0 ? (
            <>
              <Box sx={{ px: 2, pt: 1 }}>
                <Tabs
                  value={tabValue}
                  onChange={handleChangeTaskTab}
                  aria-label="task tabs"
                  sx={{
                    '& .MuiTab-root': { borderRadius: '8px 8px 0 0' },
                    '& .Mui-selected': { bgcolor: 'primary.main', color: '#fff !important' },
                    '& .MuiTabs-indicator': { display: 'none' },
                  }}
                >
                  {Object.keys(taskData).map((task_key, task_index) => (
                    <Tab label={taskData[task_key].task.display_name} {...a11yProps(task_index)} key={task_index} />
                  ))}
                </Tabs>
              </Box>

              {Object.keys(taskData).map((task_key, task_index) => (
                <CustomTabPanel value={tabValue} index={task_index} key={task_index}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                    {taskData[task_key].task.description}
                  </Typography>
                  <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                    <Button variant="contained" color="success" startIcon={<PlayArrowIcon />}>
                      RUN ALL
                    </Button>
                    <Button variant="outlined" color="error" startIcon={<StopIcon />}>
                      KILL ALL
                    </Button>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {Object.keys(taskData[task_key].programs).map((node_key, node_index) => {
                      const isRunning = runStatus && runStatus[task_key][node_key];
                      return (
                        <Card
                          key={node_index}
                          elevation={2}
                          sx={{
                            borderLeft: '4px solid',
                            borderLeftColor: isRunning ? '#1565C0' : '#BDBDBD',
                            position: 'relative',
                          }}
                        >
                          {isRunning && (
                            <LinearProgress
                              sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 }}
                            />
                          )}
                          <CardContent sx={{ pt: isRunning ? 2.5 : 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {taskData[task_key].programs[node_key].display_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {taskData[task_key].programs[node_key].description}
                            </Typography>
                            <Chip
                              label={`$ ${taskData[task_key].programs[node_key].command.template}`}
                              size="small"
                              sx={{
                                fontFamily: 'monospace',
                                bgcolor: '#F5F5F5',
                                border: '1px solid #E0E0E0',
                                mb: 1,
                              }}
                            />
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                              <FormControlLabel
                                label="Debug"
                                control={
                                  <Checkbox
                                    size="small"
                                    checked={debugChecked[task_index][node_index]}
                                    onChange={(e) => handleChangeDebug(e, task_index, node_index)}
                                  />
                                }
                              />
                              <Button
                                variant="contained"
                                color="success"
                                size="small"
                                startIcon={<PlayArrowIcon />}
                                onClick={() => handleRunButtonClick(task_key, node_key, debugChecked[task_index][node_index], optionVariables)}
                              >
                                RUN
                              </Button>
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<StopIcon />}
                                onClick={() => handleKillButtonClick(task_key, node_key)}
                              >
                                KILL
                              </Button>
                              <Button
                                variant="outlined"
                                color="inherit"
                                size="small"
                                startIcon={<ArticleIcon />}
                                onClick={() => handleGetLogButtonClick(task_key, node_key)}
                              >
                                LOG
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                </CustomTabPanel>
              ))}
            </>
          ) : (
            <Box sx={{ p: 4 }}>
              <Typography color="text.secondary">No task data found. Please check task controller is running.</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </AppLayout>
  );
}
