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
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ArticleIcon from '@mui/icons-material/Article';
import RouterIcon from '@mui/icons-material/Router';
import StorageIcon from '@mui/icons-material/Storage';

import OptionVariables from '~/components/dashboard/OptionVariablesParser';
import LogModal from '~/components/dashboard/LogModal';
import AppLayout from '~/components/AppLayout';
import { useRos } from '~/scripts/ros';
import { useTaskStarter } from '~/scripts/taskstarter_context';

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

  const { hostname } = useRos();
  const {
    serverIp, setServerIp,
    serverIpInput, setServerIpInput,
    connectError, setConnectError,
    networkIf, setNetworkIf,
    networkIp, setNetworkIp,
    networkInterfaces, setNetworkInterfaces,
    nodeDockerMode, setNodeDockerMode,
    nodeComposePath, setNodeComposePath,
    runStatus, setRunStatus,
    debugChecked, setDebugChecked,
    taskData, setTaskData,
    tabValue, setTabValue,
    optionVariables, setOptionVariable,
  } = useTaskStarter();

  const fetchExecutionConfig = async (ip: string) => {
    const [cfgRes, nifRes] = await Promise.all([
      fetch(`http://${ip}:3001/get_execution_config`, { cache: 'no-store' }),
      fetch(`http://${ip}:3001/get_network_interfaces`, { cache: 'no-store' }),
    ]);
    const cfg = await cfgRes.json();
    const nif = await nifRes.json();
    const interfaces: { name: string; ip: string }[] = nif.interfaces ?? [];
    setNetworkInterfaces(interfaces);
    const currentNif = cfg.network_if ?? '';
    setNetworkIf(currentNif);
    setNetworkIp(interfaces.find((i) => i.name === currentNif)?.ip ?? '');
  };

  const applyExecutionConfig = async (ip: string, nif: string, rosMaster?: string) => {
    await fetch(`http://${ip}:3001/set_execution_config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ network_if: nif, ros_master_uri: rosMaster ?? hostname }),
    });
  };

  const handleNodeDockerModeChange = async (taskName: string, nodeName: string, mode: 'local' | 'docker') => {
    const dockerMode = mode === 'docker';
    setNodeDockerMode((prev) => ({
      ...prev,
      [taskName]: { ...prev[taskName], [nodeName]: dockerMode },
    }));
    await fetch(`http://${serverIp}:3001/set_node_config/${taskName}/${nodeName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docker_mode: dockerMode }),
    });
  };

  const handleNodeComposePathChange = async (taskName: string, nodeName: string, path: string) => {
    setNodeComposePath((prev) => ({
      ...prev,
      [taskName]: { ...prev[taskName], [nodeName]: path },
    }));
    await fetch(`http://${serverIp}:3001/set_node_config/${taskName}/${nodeName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compose_path: path }),
    });
  };

  const getTask = async (ip: string) => {
    const response = await fetch(`http://${ip}:3001/get_task`, { cache: 'no-store' });
    const tasks = await response.json();
    return tasks;
  };

  const getTaskRunning = async (taskName: string, nodeName: string) => {
    const response = await fetch(`http://${serverIp}:3001/task_running/${taskName}/${nodeName}`, { cache: 'no-store' });
    const is_running = await response.json();
    return is_running;
  };

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

    const response = await fetch(`http://${serverIp}:3001/run_task/${taskName}/${nodeName}`, {
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
    const response = await fetch(`http://${serverIp}:3001/kill_task/${taskName}/${nodeName}`, {
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

  const [openLogModal, setOpenLogModal] = useState<any[]>([]);
  const handleGetLogButtonClick = (taskName, nodeName) => {
    setOpenLogModal([taskName, nodeName]);
  };

  const handleChangeDebug = (_event, task_index, node_index) => {
    var copy = debugChecked;
    copy[task_index][node_index] = _event.target.checked;
    setDebugChecked([...copy]);
  };

  const loadTasks = async (ip: string) => {
    const tsData = await getTask(ip);
    var checkboxLength: boolean[][] = [];
    for (var task_k in tsData) {
      var L: boolean[] = [];
      for (var i = 0; i < Object.keys(tsData[task_k].programs).length; i++) {
        L.push(false);
      }
      checkboxLength.push(L);
    }
    setDebugChecked(checkboxLength);

    var runStatusDict: any = {};
    var dockerModeDict: Record<string, Record<string, boolean>> = {};
    var composePathDict: Record<string, Record<string, string>> = {};
    for (var task_k in tsData) {
      var K: any = {};
      var D: Record<string, boolean> = {};
      var C: Record<string, string> = {};
      for (var node_k in tsData[task_k].programs) {
        const res = await fetch(`http://${ip}:3001/task_running/${task_k}/${node_k}`, { cache: 'no-store' }).then(r => r.json());
        K[node_k] = res.is_running;
        D[node_k] = tsData[task_k].programs[node_k].docker_mode ?? false;
        C[node_k] = tsData[task_k].programs[node_k].compose_path ?? '';
      }
      runStatusDict[task_k] = K;
      dockerModeDict[task_k] = D;
      composePathDict[task_k] = C;
    }
    setRunStatus({ ...runStatusDict });
    setNodeDockerMode(dockerModeDict);
    setNodeComposePath(composePathDict);
    setTaskData(tsData);
  };

  const handleConnect = async () => {
    setConnectError('');
    try {
      await Promise.all([loadTasks(serverIpInput), fetchExecutionConfig(serverIpInput)]);
      await applyExecutionConfig(serverIpInput, networkIf, hostname);
      setServerIp(serverIpInput);
    } catch {
      setConnectError(`サーバー (${serverIpInput}:3001) に接続できません。`);
    }
  };

  useEffect(() => {
    if (!taskData) {
      Promise.all([loadTasks(serverIp), fetchExecutionConfig(serverIp)]).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (serverIp) {
      applyExecutionConfig(serverIp, networkIf, hostname).catch(() => {});
    }
  }, [hostname]);

  const handleChangeTaskTab = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <AppLayout>
      <LogModal openModal={openLogModal} serverIp={serverIp} />

      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1565C0' }}>Task Starter</Typography>
        </Box>
        <Box sx={{ px: 3, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Server IP"
            size="small"
            value={serverIpInput}
            onChange={(e) => setServerIpInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(); }}
            placeholder="192.168.1.10"
            sx={{ minWidth: 180 }}
          />
          <Button variant="contained" startIcon={<RouterIcon />} onClick={handleConnect}>
            Connect
          </Button>
          {connectError && (
            <Typography variant="body2" color="error">{connectError}</Typography>
          )}
          {taskData && !connectError && (
            <Typography variant="body2" color="success.main">接続済み: {serverIp}:3001</Typography>
          )}
        </Box>

        {/* Execution config bar */}
        <Box sx={{ px: 3, py: 1, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', bgcolor: 'grey.50' }}>
          <StorageIcon fontSize="small" sx={{ color: 'text.secondary' }} />

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Network IF</InputLabel>
            <Select
              value={networkIf}
              label="Network IF"
              onChange={(e) => {
                const selected = e.target.value;
                setNetworkIf(selected);
                setNetworkIp(networkInterfaces.find((i) => i.name === selected)?.ip ?? '');
                applyExecutionConfig(serverIp, selected);
              }}
            >
              {networkInterfaces.map((iface) => (
                <MenuItem key={iface.name} value={iface.name}>{iface.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {networkIp && (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
              {networkIp}
            </Typography>
          )}
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
                              <ToggleButtonGroup
                                value={nodeDockerMode[task_key]?.[node_key] ? 'docker' : 'local'}
                                exclusive
                                size="small"
                                onChange={(_e, val) => {
                                  if (!val) return;
                                  handleNodeDockerModeChange(task_key, node_key, val);
                                }}
                              >
                                <ToggleButton value="local">Local</ToggleButton>
                                <ToggleButton value="docker">Docker</ToggleButton>
                              </ToggleButtonGroup>
                              {nodeDockerMode[task_key]?.[node_key] && (
                                <TextField
                                  label="compose.yaml"
                                  size="small"
                                  value={nodeComposePath[task_key]?.[node_key] ?? ''}
                                  onChange={(e) =>
                                    setNodeComposePath((prev) => ({
                                      ...prev,
                                      [task_key]: { ...prev[task_key], [node_key]: e.target.value },
                                    }))
                                  }
                                  onBlur={() => handleNodeComposePathChange(task_key, node_key, nodeComposePath[task_key]?.[node_key] ?? '')}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleNodeComposePathChange(task_key, node_key, nodeComposePath[task_key]?.[node_key] ?? '');
                                  }}
                                  sx={{ minWidth: 260 }}
                                />
                              )}
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
