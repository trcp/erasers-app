import { createContext, useContext, useEffect, useRef, useState } from 'react';
import ROSLIB from 'roslib';

const DEFAULT_HOSTNAME = import.meta.env.VITE_MASTER_HOSTNAME ?? 'localhost';
const STORAGE_KEY = 'ros_hostname';

function buildUrl(host: string) {
  return `ws://${host}:9090`;
}

interface RosContextValue {
  ros: ROSLIB.Ros | null;
  rosConnected: boolean;
  hostname: string;
  setHostname: (host: string) => void;
}

const RosContext = createContext<RosContextValue>({
  ros: null,
  rosConnected: false,
  hostname: DEFAULT_HOSTNAME,
  setHostname: () => {},
});

export function RosProvider({ children }: { children: React.ReactNode }) {
  const [hostname, setHostnameState] = useState<string>(
    () => (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null) ?? DEFAULT_HOSTNAME
  );
  const hostnameRef = useRef(hostname);
  hostnameRef.current = hostname;

  const rosRef = useRef<ROSLIB.Ros | null>(null);
  const [ros, setRos] = useState<ROSLIB.Ros | null>(null);
  const [rosConnected, setRosConnected] = useState(false);

  useEffect(() => {
    const instance = new ROSLIB.Ros({ url: buildUrl(hostnameRef.current) });
    rosRef.current = instance;
    setRos(instance);
    instance.on('connection', () => setRosConnected(true));
    instance.on('close', () => {
      setRosConnected(false);
      instance.connect(buildUrl(hostnameRef.current));
    });
    instance.on('error', () => {
      setRosConnected(false);
      instance.connect(buildUrl(hostnameRef.current));
    });
  }, []);

  const setHostname = (host: string) => {
    localStorage.setItem(STORAGE_KEY, host);
    hostnameRef.current = host;
    setHostnameState(host);
    setRosConnected(false);
    rosRef.current?.connect(buildUrl(host));
  };

  return (
    <RosContext.Provider value={{ ros, rosConnected, hostname, setHostname }}>
      {children}
    </RosContext.Provider>
  );
}

export function useRos() {
  return useContext(RosContext);
}
