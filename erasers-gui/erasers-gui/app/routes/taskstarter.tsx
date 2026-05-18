import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import ArticleIcon from '@mui/icons-material/Article';
import ComputerIcon from '@mui/icons-material/Computer';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RouterIcon from '@mui/icons-material/Router';
import StopIcon from '@mui/icons-material/Stop';
import StorageIcon from '@mui/icons-material/Storage';
import TerminalIcon from '@mui/icons-material/Terminal';

import OptionVariables from '~/components/dashboard/OptionVariablesParser';
import LogModal from '~/components/dashboard/LogModal';
import AppLayout from '~/components/AppLayout';
import { useRos } from '~/scripts/ros';
import { useTaskStarter, generateId, type ServerEntry } from '~/scripts/taskstarter_context';


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

  const theme = useTheme();
  const isLg = useMediaQuery(theme.breakpoints.up('lg'));

  const headerRef = useRef<HTMLDivElement>(null);
  const setupPanelRef = useRef<HTMLDivElement>(null);
  const [taskListTooSmall, setTaskListTooSmall] = useState(false);

  useEffect(() => {
    const check = () => {
      if (!isLg) { setTaskListTooSmall(false); return; }
      const headerH = headerRef.current?.offsetHeight ?? 0;
      const setupH = setupPanelRef.current?.offsetHeight ?? 0;
      setTaskListTooSmall(window.innerHeight - headerH - setupH < 300);
    };
    const observer = new ResizeObserver(check);
    if (headerRef.current) observer.observe(headerRef.current);
    if (setupPanelRef.current) observer.observe(setupPanelRef.current);
    window.addEventListener('resize', check);
    check();
    return () => { observer.disconnect(); window.removeEventListener('resize', check); };
  }, [isLg]);

  const useNativeScroll = !isLg || taskListTooSmall;

  const { hostname } = useRos();
  const {
    serverIp, setServerIp,
    serverIpInput, setServerIpInput,
    connectError, setConnectError,
    networkIf, setNetworkIf,
    networkIp, setNetworkIp,
    networkInterfaces, setNetworkInterfaces,
    networkIfMap, setNetworkIfMap,
    networkInterfacesMap, setNetworkInterfacesMap,
    nodeDockerMode, setNodeDockerMode,
    nodeComposePath, setNodeComposePath,
    runStatus, setRunStatus,
    debugChecked, setDebugChecked,
    taskData, setTaskData,
    tabValue, setTabValue,
    optionVariables, setOptionVariable,
    servers, primaryServerId,
    addServer, removeServer, setPrimaryServerId,
  } = useTaskStarter();

  const [crashAlert, setCrashAlert] = useState<{ taskDisplay: string; nodeDisplay: string; code: number } | null>(null);
  const runStatusRef = useRef<any>(null);
  useEffect(() => { runStatusRef.current = runStatus; }, [runStatus]);

  // Per-server online map
  const [serverOnlineMap, setServerOnlineMap] = useState<Record<string, boolean>>({});

  const primaryIp = servers.find(s => s.id === primaryServerId)?.ip ?? serverIp;
  const srvOnline = serverOnlineMap[primaryIp] ?? false;
  const isLocal = !primaryIp || primaryIp === 'localhost' || primaryIp === '127.0.0.1';

  // Which server's NI is currently shown in the Network section

  // Poll all registered servers for online status
  useEffect(() => {
    const checkAll = async () => {
      if (servers.length === 0) return;
      const results: Record<string, boolean> = {};
      await Promise.allSettled(
        servers.map(async (srv) => {
          try {
            await fetch(`http://${srv.ip}:3001/get_task`, { signal: AbortSignal.timeout(1500) });
            results[srv.ip] = true;
          } catch {
            results[srv.ip] = false;
          }
        })
      );
      setServerOnlineMap(results);
    };
    checkAll();
    const id = setInterval(checkAll, 3000);
    return () => clearInterval(id);
  }, [servers]);

  // Server add dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newServerLabel, setNewServerLabel] = useState('');
  const [newServerIp, setNewServerIp] = useState('');

  const handleAddServer = () => {
    const label = newServerLabel.trim();
    const ip = newServerIp.trim();
    if (!label || !ip) return;
    addServer({ id: generateId(), label, ip });
    setNewServerLabel('');
    setNewServerIp('');
    setAddDialogOpen(false);
  };

  const handleAddAndConnect = async () => {
    const label = newServerLabel.trim();
    const ip = newServerIp.trim();
    if (!label || !ip) return;
    const newId = generateId();
    addServer({ id: newId, label, ip });
    setNewServerLabel('');
    setNewServerIp('');
    setAddDialogOpen(false);
    setConnectError('');
    try {
      const [, fetchedNif] = await Promise.all([
        loadTasks(ip),
        fetchExecutionConfig(ip),
      ]);
      await applyExecutionConfig(ip, fetchedNif, hostname);
      setPrimaryServerId(newId, ip);
    } catch {
      setConnectError(`サーバー (${ip}:3001) に接続できません。`);
    }
  };

  const [srvConfig, setSrvConfig] = useState(
    () => (typeof window !== 'undefined' ? localStorage.getItem('erasers_server_config') : null) ?? ''
  );

  const handleStart = () => {
    localStorage.setItem('erasers_server_config', srvConfig);
    window.location.href = `erasers://start?config=${encodeURIComponent(srvConfig)}`;
  };

  // Poll running status — use targetIp stored per node
  useEffect(() => {
    if (!serverIp || !taskData) return;
    const id = setInterval(async () => {
      const rs = runStatusRef.current;
      if (!rs) return;
      for (const tk of Object.keys(rs)) {
        for (const nk of Object.keys(rs[tk])) {
          const entry = rs[tk][nk];
          if (!entry?.is_running) continue;
          const targetIp = entry.targetIp ?? serverIp;
          try {
            const r = await fetch(`http://${targetIp}:3001/task_running/${tk}/${nk}`, { cache: 'no-store' });
            const d = await r.json();
            if (!d.is_running) {
              setRunStatus((prev: any) => ({ ...prev, [tk]: { ...prev[tk], [nk]: false } }));
              if (d.exit_code !== null && d.exit_code !== 0) {
                const taskDisp = taskData[tk]?.task?.display_name ?? tk;
                const nodeDisp = taskData[tk]?.programs?.[nk]?.display_name ?? nk;
                setCrashAlert({ taskDisplay: taskDisp, nodeDisplay: nodeDisp, code: d.exit_code });
              }
            }
          } catch {}
        }
      }
    }, 3000);
    return () => clearInterval(id);
  }, [serverIp, taskData]);

  const fetchExecutionConfig = async (ip: string) => {
    const [cfgRes, nifRes] = await Promise.all([
      fetch(`http://${ip}:3001/get_execution_config`, { cache: 'no-store' }),
      fetch(`http://${ip}:3001/get_network_interfaces`, { cache: 'no-store' }),
    ]);
    const cfg = await cfgRes.json();
    const nif = await nifRes.json();
    const interfaces: { name: string; ip: string }[] = nif.interfaces ?? [];
    const currentNif = cfg.network_if ?? '';
    // Update per-server maps
    setNetworkInterfacesMap(prev => ({ ...prev, [ip]: interfaces }));
    setNetworkIfMap(prev => ({ ...prev, [ip]: currentNif }));
    // Keep global state in sync (used by primary server)
    setNetworkInterfaces(interfaces);
    setNetworkIf(currentNif);
    setNetworkIp(interfaces.find((i) => i.name === currentNif)?.ip ?? '');
    return currentNif;
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
    await fetch(`http://${primaryIp}:3001/set_node_config/${taskName}/${nodeName}`, {
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
    await fetch(`http://${primaryIp}:3001/set_node_config/${taskName}/${nodeName}`, {
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

  const handleRunButtonClick = async (taskName, nodeName, debug, option) => {
    var _body: any = { "debug": debug };
    const defaultop = taskData[taskName].programs[nodeName].command.variables;
    const setedop = option[taskName]?.[nodeName];
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

    const response = await fetch(`http://${primaryIp}:3001/run_task/${taskName}/${nodeName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_body),
    });

    if (response.ok) {
      var run_status = runStatus;
      run_status[taskName][nodeName] = { is_running: true, targetIp: primaryIp };
      setRunStatus({ ...run_status });
    }
  };

  const handleRunWithTerminalButtonClick = async (taskName, nodeName) => {
    const defaultop = taskData[taskName].programs[nodeName].command.variables;
    const setedop = optionVariables[taskName]?.[nodeName];
    var _body: any = { terminal: true };
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
    const response = await fetch(`http://${primaryIp}:3001/run_task/${taskName}/${nodeName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_body),
    });
    if (response.ok) {
      var run_status = runStatus;
      run_status[taskName][nodeName] = { is_running: true, targetIp: primaryIp };
      setRunStatus({ ...run_status });
    }
  };

  const handleCheckAllDockerMode = async (taskName: string, mode: 'local' | 'docker') => {
    const nodeNames = Object.keys(taskData[taskName].programs);
    await Promise.all(nodeNames.map((nodeName) => handleNodeDockerModeChange(taskName, nodeName, mode)));
  };

  const handleRunAllOnServer = async (taskName: string) => {
    const nodeNames = Object.keys(taskData[taskName].programs);
    await Promise.all(nodeNames.map((nodeName) =>
      handleRunButtonClick(taskName, nodeName, false, optionVariables)
    ));
  };

  const handleRunWeztermButtonClick = async (taskName, targetIp: string) => {
    await fetch(`http://${targetIp}:3001/run_wezterm/${taskName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  };

  const handleKillAllButtonClick = async (taskName) => {
    const nodeNames = Object.keys(taskData[taskName].programs);
    await Promise.all(nodeNames.map((nodeName) =>
      handleKillButtonClick(taskName, nodeName)
    ));
  };

  const handleKillButtonClick = async (taskName, nodeName) => {
    const entry = runStatus?.[taskName]?.[nodeName];
    const targetIp = entry?.targetIp ?? serverIp;
    const response = await fetch(`http://${targetIp}:3001/kill_task/${taskName}/${nodeName}`, {
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
    const entry = runStatus?.[taskName]?.[nodeName];
    const targetIp = entry?.targetIp ?? serverIp;
    setOpenLogModal([taskName, nodeName, targetIp]);
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
        K[node_k] = res.is_running ? { is_running: true, targetIp: ip } : false;
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

  const handleSelectPrimary = async (id: string) => {
    const srv = servers.find(s => s.id === id);
    if (!srv) return;
    setConnectError('');
    try {
      const [, fetchedNif] = await Promise.all([
        loadTasks(srv.ip),
        fetchExecutionConfig(srv.ip),
      ]);
      await applyExecutionConfig(srv.ip, fetchedNif, hostname);
      setPrimaryServerId(id, srv.ip);
    } catch {
      setConnectError(`サーバー (${srv.ip}:3001) に接続できません。`);
    }
  };

  useEffect(() => {
    if (!taskData && servers.length > 0) {
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
    <AppLayout nativeScroll={useNativeScroll}>
      <LogModal openModal={openLogModal} serverIp={serverIp} />
      <Snackbar
        open={!!crashAlert}
        autoHideDuration={8000}
        onClose={() => setCrashAlert(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setCrashAlert(null)} sx={{ width: '100%' }}>
          {crashAlert && `${crashAlert.nodeDisplay}（${crashAlert.taskDisplay}）がエラー終了しました (exit code: ${crashAlert.code})`}
        </Alert>
      </Snackbar>

      {/* Server add dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>サーバーを追加</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <TextField
            label="表示名 (例: Robot PC1)"
            size="small"
            value={newServerLabel}
            onChange={(e) => setNewServerLabel(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            label="IPアドレス (例: 192.168.1.10)"
            size="small"
            value={newServerIp}
            onChange={(e) => setNewServerIp(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddServer(); }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleAddServer} disabled={!newServerLabel.trim() || !newServerIp.trim()}>
            追加
          </Button>
          <Button
            variant="contained"
            onClick={handleAddAndConnect}
            disabled={!newServerLabel.trim() || !newServerIp.trim()}
          >
            追加して接続
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ display: 'flex', flexDirection: 'column', height: useNativeScroll ? 'auto' : '100%' }}>
        {/* Header */}
        <Box ref={headerRef} sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1565C0' }}>Task Starter</Typography>
        </Box>

        {/* Setup Panel */}
        <Box ref={setupPanelRef} sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50', display: 'flex', alignItems: 'flex-start', gap: 0, flexWrap: 'wrap' }}>

          {/* Task Controller Server */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pr: 3 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              サーバー起動 / Server
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.5 }}>
              このPCでサーバーを起動する場合に使用します
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={srvOnline ? 'Running' : 'Stopped'}
                size="small"
                sx={{
                  bgcolor: srvOnline ? '#E8F5E9' : '#FAFAFA',
                  color: srvOnline ? '#2E7D32' : '#9E9E9E',
                  fontWeight: 700,
                  border: '1px solid',
                  borderColor: srvOnline ? '#A5D6A7' : '#E0E0E0',
                }}
              />
              {!srvOnline && isLocal && (
                <>
                  <TextField
                    label="Config path"
                    size="small"
                    value={srvConfig}
                    onChange={(e) => setSrvConfig(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleStart(); }}
                    placeholder="/path/to/config/dir"
                    sx={{ width: 220 }}
                  />
                  <Button variant="contained" size="small" onClick={handleStart}>
                    起動
                  </Button>
                </>
              )}
              {!srvOnline && !isLocal && (
                <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                  リモート接続中 — 起動はサーバーPC側で行ってください
                </Typography>
              )}
            </Box>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />

          {/* Servers management */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pr: 3 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              サーバー管理 / Servers
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.5 }}>
              接続するサーバーを選択してください（クリックで接続）
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              {servers.map((srv) => {
                const isOnline = serverOnlineMap[srv.ip] ?? false;
                const isPrimary = srv.id === primaryServerId;
                return (
                  <Tooltip key={srv.id} title={isPrimary ? '接続中' : 'クリックして接続'} placement="top">
                    <Chip
                      label={`${srv.label} (${srv.ip})`}
                      icon={<ComputerIcon sx={{ fontSize: isPrimary ? '1rem !important' : '0.9rem !important' }} />}
                      onClick={() => handleSelectPrimary(srv.id)}
                      onDelete={() => removeServer(srv.id)}
                      deleteIcon={<DeleteIcon />}
                      sx={{
                        height: isPrimary ? 36 : 28,
                        fontSize: isPrimary ? '0.85rem' : '0.75rem',
                        bgcolor: isPrimary ? '#1565C0' : (isOnline ? '#E8F5E9' : '#FAFAFA'),
                        color: isPrimary ? '#fff' : (isOnline ? '#2E7D32' : '#9E9E9E'),
                        fontWeight: isPrimary ? 700 : 400,
                        border: isPrimary ? '2px solid #0D47A1' : '1px solid',
                        borderColor: isPrimary ? '#0D47A1' : (isOnline ? '#A5D6A7' : '#E0E0E0'),
                        boxShadow: isPrimary ? '0 2px 6px rgba(21,101,192,0.35)' : 'none',
                        cursor: 'pointer',
                        '& .MuiChip-icon': { color: 'inherit' },
                        '& .MuiChip-deleteIcon': { color: 'inherit', opacity: isPrimary ? 0.8 : 0.6, '&:hover': { opacity: 1 } },
                      }}
                    />
                  </Tooltip>
                );
              })}
              <Tooltip title="サーバーを追加" placement="top">
                <IconButton
                  size="small"
                  onClick={() => setAddDialogOpen(true)}
                  sx={{ bgcolor: '#F5F5F5', '&:hover': { bgcolor: '#E0E0E0' } }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            {connectError && (
              <Typography variant="body2" color="error">{connectError}</Typography>
            )}
            {taskData && !connectError && primaryServerId && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: '#4CAF50', flexShrink: 0 }} />
                <Typography variant="body2" sx={{ color: '#2E7D32', fontWeight: 600 }}>
                  {primaryIp}:3001 に接続中
                </Typography>
              </Box>
            )}
          </Box>

          {servers.length > 0 && <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}

          {/* Network IF */}
          {servers.length > 0 && <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              ネットワーク設定 / Network
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.5 }}>
              接続中のサーバーのネットワークインターフェースを設定します
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Network IF</InputLabel>
                <Select
                  value={networkIfMap[primaryIp] ?? ''}
                  label="Network IF"
                  onChange={(e) => {
                    const selected = e.target.value as string;
                    const ifaces = networkInterfacesMap[primaryIp] ?? [];
                    const resolvedIp = ifaces.find((i) => i.name === selected)?.ip ?? '';
                    setNetworkIfMap(prev => ({ ...prev, [primaryIp]: selected }));
                    setNetworkIf(selected);
                    setNetworkIp(resolvedIp);
                    applyExecutionConfig(primaryIp, selected);
                  }}
                >
                  {(networkInterfacesMap[primaryIp] ?? []).map((iface) => (
                    <MenuItem key={iface.name} value={iface.name}>{iface.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {(() => {
                const nif = networkIfMap[primaryIp] ?? '';
                const ifaces = networkInterfacesMap[primaryIp] ?? [];
                const ip = ifaces.find((i) => i.name === nif)?.ip;
                return ip ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                    {ip}
                  </Typography>
                ) : null;
              })()}
            </Box>
          </Box>}

        </Box>

        <Box sx={{ flex: useNativeScroll ? 'none' : 1, overflow: useNativeScroll ? 'visible' : 'auto' }}>
          {taskData && debugChecked && runStatus && Object.keys(taskData).length > 0 ? (
            <>
              <Box sx={{ px: 2, pt: 1, pb: 1, position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Tabs
                  value={tabValue}
                  onChange={handleChangeTaskTab}
                  aria-label="task tabs"
                  variant="scrollable"
                  scrollButtons="auto"
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
                  {/* Task description + bulk controls */}
                  <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="body1" color="text.secondary">
                      {taskData[task_key].task.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>All:</Typography>
                      <Button variant="outlined" size="small" startIcon={<StorageIcon fontSize="small" />} onClick={() => handleCheckAllDockerMode(task_key, 'docker')}>
                        Docker
                      </Button>
                      <Button variant="outlined" size="small" startIcon={<TerminalIcon fontSize="small" />} onClick={() => handleCheckAllDockerMode(task_key, 'local')}>
                        Local
                      </Button>
                      <Divider orientation="vertical" flexItem />
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<PlayArrowIcon />}
                        disabled={!networkIf}
                        onClick={() => handleRunAllOnServer(task_key)}
                      >
                        RUN ALL
                      </Button>
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        startIcon={<TerminalIcon />}
                        disabled={!networkIf}
                        onClick={() => handleRunWeztermButtonClick(task_key, primaryIp)}
                      >
                        Terminal
                      </Button>
                      <Button variant="outlined" color="error" size="small" startIcon={<StopIcon />} onClick={() => handleKillAllButtonClick(task_key)}>
                        KILL ALL
                      </Button>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {Object.keys(taskData[task_key].programs).map((node_key, node_index) => {
                      const nodeEntry = runStatus?.[task_key]?.[node_key];
                      const isRunning = nodeEntry?.is_running ?? false;
                      return (
                        <Card
                          key={node_index}
                          elevation={isRunning ? 3 : 1}
                          sx={{
                            borderLeft: '4px solid',
                            borderLeftColor: isRunning ? '#1565C0' : '#BDBDBD',
                            position: 'relative',
                          }}
                        >
                          {isRunning && (
                            <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 }} />
                          )}
                          <CardContent sx={{ pt: isRunning ? 2.5 : 2, pb: '12px !important' }}>

                            {/* Title row */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {taskData[task_key].programs[node_key].display_name}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  label={isRunning ? 'Running' : 'Stopped'}
                                  size="small"
                                  sx={{
                                    bgcolor: isRunning ? '#E3F2FD' : '#F5F5F5',
                                    color: isRunning ? '#1565C0' : '#9E9E9E',
                                    fontWeight: 700,
                                    border: '1px solid',
                                    borderColor: isRunning ? '#90CAF9' : '#E0E0E0',
                                  }}
                                />
                              </Box>
                            </Box>

                            {/* Description */}
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {taskData[task_key].programs[node_key].description}
                            </Typography>

                            {/* Command chip */}
                            <Chip
                              label={`$ ${taskData[task_key].programs[node_key].command.template}`}
                              size="small"
                              sx={{ fontFamily: 'monospace', bgcolor: '#F5F5F5', border: '1px solid #E0E0E0', mb: 1 }}
                            />

                            {/* Option variables */}
                            {Object.keys(taskData[task_key].programs[node_key].command.variables).length > 0 && (
                              <Box sx={{ mb: 1 }}>
                                {Object.keys(taskData[task_key].programs[node_key].command.variables).map((opt_key, opt_index) => (
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
                                ))}
                              </Box>
                            )}

                            <Divider sx={{ my: 1 }} />

                            {/* Settings + Actions row */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'space-between' }}>

                              {/* Settings (left) */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
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
                                    sx={{ minWidth: 240 }}
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
                              </Box>

                              {/* Actions (right) */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  startIcon={<PlayArrowIcon />}
                                  disabled={!networkIf}
                                  onClick={() => handleRunButtonClick(
                                    task_key, node_key,
                                    debugChecked[task_index][node_index],
                                    optionVariables,
                                  )}
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
                                <Divider orientation="vertical" flexItem />
                                <Button
                                  variant="outlined"
                                  color="primary"
                                  size="small"
                                  startIcon={<TerminalIcon />}
                                  disabled={!networkIf}
                                  onClick={() => handleRunWithTerminalButtonClick(task_key, node_key)}
                                >
                                  Terminal
                                </Button>
                                <Button
                                  variant="outlined"
                                  color="inherit"
                                  size="small"
                                  startIcon={<ArticleIcon />}
                                  onClick={() => handleGetLogButtonClick(task_key, node_key)}
                                >
                                  Log
                                </Button>
                              </Box>
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
              <Typography color="text.secondary">
                {servers.length === 0
                  ? 'サーバーを追加して接続してください。'
                  : 'No task data found. Please check task controller is running.'}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </AppLayout>
  );
}
