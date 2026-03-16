import { createContext, useContext, useEffect, useRef, useState } from 'react';
import ROSLIB from 'roslib';

const hostName = import.meta.env.VITE_MASTER_HOSTNAME;
const ROS_URL = `ws://${hostName}:9090`;

interface RosContextValue {
  ros: ROSLIB.Ros | null;
  rosConnected: boolean;
}

const RosContext = createContext<RosContextValue>({ ros: null, rosConnected: false });

export function RosProvider({ children }: { children: React.ReactNode }) {
  const rosRef = useRef<ROSLIB.Ros | null>(null);
  const [rosConnected, setRosConnected] = useState(false);

  if (!rosRef.current) {
    rosRef.current = new ROSLIB.Ros({ url: ROS_URL });
  }

  useEffect(() => {
    const ros = rosRef.current!;
    ros.on('connection', () => setRosConnected(true));
    ros.on('close', () => {
      setRosConnected(false);
      ros.connect(ROS_URL);
    });
    ros.on('error', () => {
      setRosConnected(false);
      ros.connect(ROS_URL);
    });
  }, []);

  return (
    <RosContext.Provider value={{ ros: rosRef.current, rosConnected }}>
      {children}
    </RosContext.Provider>
  );
}

export function useRos() {
  return useContext(RosContext);
}
