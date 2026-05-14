import { createContext, useContext, useState } from 'react';

const STORAGE_KEY_LEGACY  = 'taskstarter_server_ip';
const STORAGE_KEY_SERVERS = 'taskstarter_servers';
const STORAGE_KEY_PRIMARY = 'taskstarter_primary_server_id';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export { generateId };

export interface ServerEntry {
  id: string;
  label: string;
  ip: string;
}

function loadInitialServers(): ServerEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SERVERS);
    if (saved) return JSON.parse(saved);
  } catch {}
  const legacyIp = localStorage.getItem(STORAGE_KEY_LEGACY);
  if (legacyIp) {
    const entry: ServerEntry = { id: generateId(), label: 'Default', ip: legacyIp };
    localStorage.setItem(STORAGE_KEY_SERVERS, JSON.stringify([entry]));
    return [entry];
  }
  return [];
}

function loadInitialPrimaryId(servers: ServerEntry[]): string {
  if (typeof window === 'undefined') return servers[0]?.id ?? '';
  const saved = localStorage.getItem(STORAGE_KEY_PRIMARY);
  if (saved && servers.find(s => s.id === saved)) return saved;
  return servers[0]?.id ?? '';
}

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
  networkIfMap: Record<string, string>;
  setNetworkIfMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  networkInterfacesMap: Record<string, { name: string; ip: string }[]>;
  setNetworkInterfacesMap: React.Dispatch<React.SetStateAction<Record<string, { name: string; ip: string }[]>>>;
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
  servers: ServerEntry[];
  primaryServerId: string;
  addServer: (entry: ServerEntry) => void;
  removeServer: (id: string) => void;
  setPrimaryServerId: (id: string, ip?: string) => void;
}

const TaskStarterContext = createContext<TaskStarterContextType | null>(null);

export function TaskStarterProvider({ children }: { children: React.ReactNode }) {
  const [servers, _setServers] = useState<ServerEntry[]>(loadInitialServers);
  const [primaryServerId, _setPrimaryServerId] = useState<string>(
    () => loadInitialPrimaryId(loadInitialServers())
  );
  const [_serverIp, _setServerIp] = useState<string>(() => {
    const srvs = loadInitialServers();
    const primId = loadInitialPrimaryId(srvs);
    return srvs.find(s => s.id === primId)?.ip
      ?? (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_LEGACY) : null)
      ?? 'localhost';
  });

  const setServerIp = (ip: string) => {
    localStorage.setItem(STORAGE_KEY_LEGACY, ip);
    _setServerIp(ip);
  };

  const [serverIpInput, setServerIpInput] = useState(_serverIp);
  const [connectError, setConnectError] = useState('');
  const [networkIf, setNetworkIf] = useState('');
  const [networkIp, setNetworkIp] = useState('');
  const [networkInterfaces, setNetworkInterfaces] = useState<{ name: string; ip: string }[]>([]);
  const [networkIfMap, setNetworkIfMap] = useState<Record<string, string>>({});
  const [networkInterfacesMap, setNetworkInterfacesMap] = useState<Record<string, { name: string; ip: string }[]>>({});
  const [nodeDockerMode, setNodeDockerMode] = useState<Record<string, Record<string, boolean>>>({});
  const [nodeComposePath, setNodeComposePath] = useState<Record<string, Record<string, string>>>({});
  const [runStatus, setRunStatus] = useState(null);
  const [debugChecked, setDebugChecked] = useState(null);
  const [taskData, setTaskData] = useState<any>(null);
  const [tabValue, setTabValue] = useState(0);
  const [optionVariables, setOptionVariable] = useState({});

  const persistServers = (list: ServerEntry[]) => {
    localStorage.setItem(STORAGE_KEY_SERVERS, JSON.stringify(list));
    _setServers(list);
  };

  const addServer = (entry: ServerEntry) => {
    const next = [...servers, entry];
    persistServers(next);
    if (!primaryServerId) {
      _setPrimaryServerId(entry.id);
      localStorage.setItem(STORAGE_KEY_PRIMARY, entry.id);
      setServerIp(entry.ip);
      setServerIpInput(entry.ip);
    }
  };

  const removeServer = (id: string) => {
    const next = servers.filter(s => s.id !== id);
    persistServers(next);
    if (primaryServerId === id) {
      const nextId = next[0]?.id ?? '';
      _setPrimaryServerId(nextId);
      localStorage.setItem(STORAGE_KEY_PRIMARY, nextId);
      const nextIp = next[0]?.ip ?? 'localhost';
      setServerIp(nextIp);
      setServerIpInput(nextIp);
    }
  };

  const setPrimaryServerId = (id: string, ip?: string) => {
    _setPrimaryServerId(id);
    localStorage.setItem(STORAGE_KEY_PRIMARY, id);
    const resolvedIp = ip ?? servers.find(s => s.id === id)?.ip;
    if (resolvedIp) {
      setServerIp(resolvedIp);
      setServerIpInput(resolvedIp);
    }
  };

  return (
    <TaskStarterContext.Provider value={{
      serverIp: _serverIp, setServerIp,
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
