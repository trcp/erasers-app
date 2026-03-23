import { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'taskstarter_server_ip';

interface TaskStarterContextType {
  serverIp: string;
  setServerIp: (ip: string) => void;
  serverIpInput: string;
  setServerIpInput: (ip: string) => void;
  connectError: string;
  setConnectError: (v: string) => void;
  networkIf: string;
  setNetworkIf: (v: string) => void;
  networkIp: string;
  setNetworkIp: (v: string) => void;
  networkInterfaces: { name: string; ip: string }[];
  setNetworkInterfaces: (v: { name: string; ip: string }[]) => void;
  nodeDockerMode: Record<string, Record<string, boolean>>;
  setNodeDockerMode: React.Dispatch<React.SetStateAction<Record<string, Record<string, boolean>>>>;
  nodeComposePath: Record<string, Record<string, string>>;
  setNodeComposePath: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
  runStatus: any;
  setRunStatus: (v: any) => void;
  debugChecked: any;
  setDebugChecked: (v: any) => void;
  taskData: any;
  setTaskData: (v: any) => void;
  tabValue: number;
  setTabValue: (v: number) => void;
  optionVariables: any;
  setOptionVariable: (v: any) => void;
}

const TaskStarterContext = createContext<TaskStarterContextType | null>(null);

export function TaskStarterProvider({ children }: { children: React.ReactNode }) {
  const savedIp = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY) ?? 'localhost') : 'localhost';

  const [_serverIp, _setServerIp] = useState(savedIp);
  const setServerIp = (ip: string) => {
    localStorage.setItem(STORAGE_KEY, ip);
    _setServerIp(ip);
  };

  const [serverIpInput, setServerIpInput] = useState(savedIp);
  const [connectError, setConnectError] = useState('');
  const [networkIf, setNetworkIf] = useState('');
  const [networkIp, setNetworkIp] = useState('');
  const [networkInterfaces, setNetworkInterfaces] = useState<{ name: string; ip: string }[]>([]);
  const [nodeDockerMode, setNodeDockerMode] = useState<Record<string, Record<string, boolean>>>({});
  const [nodeComposePath, setNodeComposePath] = useState<Record<string, Record<string, string>>>({});
  const [runStatus, setRunStatus] = useState(null);
  const [debugChecked, setDebugChecked] = useState(null);
  const [taskData, setTaskData] = useState<any>(null);
  const [tabValue, setTabValue] = useState(0);
  const [optionVariables, setOptionVariable] = useState({});

  return (
    <TaskStarterContext.Provider value={{
      serverIp: _serverIp, setServerIp,
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
    }}>
      {children}
    </TaskStarterContext.Provider>
  );
}

export function useTaskStarter() {
  const ctx = useContext(TaskStarterContext);
  if (!ctx) throw new Error('useTaskStarter must be used within TaskStarterProvider');
  return ctx;
}
