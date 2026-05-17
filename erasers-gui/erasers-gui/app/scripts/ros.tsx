import { createContext, useContext, useEffect, useRef, useState } from 'react';
import ROSLIB from 'roslib';
import {
  DEFAULT_PROFILE_ID,
  findProfile,
  applyOverrides,
  type RobotProfile,
  type TopicOverrides,
} from './robotProfiles';

const DEFAULT_HOSTNAME = import.meta.env.VITE_MASTER_HOSTNAME ?? 'localhost';
const STORAGE_KEY = 'ros_hostname';
const PROFILE_STORAGE_KEY = 'ros_robot_profile';
const OVERRIDES_STORAGE_KEY = 'ros_topic_overrides';

function buildUrl(host: string) {
  return `ws://${host}:9090`;
}

function loadAllOverrides(): Record<string, TopicOverrides> {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

interface RosContextValue {
  ros: ROSLIB.Ros | null;
  rosConnected: boolean;
  hostname: string;
  setHostname: (host: string) => void;
  robotProfile: RobotProfile;
  setRobotProfileId: (id: string) => void;
  topicOverrides: TopicOverrides;
  setTopicOverrides: (overrides: TopicOverrides) => void;
  resetTopicOverrides: () => void;
}

const _defaultProfile = findProfile(DEFAULT_PROFILE_ID);

const RosContext = createContext<RosContextValue>({
  ros: null,
  rosConnected: false,
  hostname: DEFAULT_HOSTNAME,
  setHostname: () => {},
  robotProfile: _defaultProfile,
  setRobotProfileId: () => {},
  topicOverrides: {},
  setTopicOverrides: () => {},
  resetTopicOverrides: () => {},
});

export function RosProvider({ children }: { children: React.ReactNode }) {
  const [hostname, setHostnameState] = useState<string>(
    () => (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null) ?? DEFAULT_HOSTNAME
  );
  const hostnameRef = useRef(hostname);
  hostnameRef.current = hostname;

  const rosRef = useRef<ROSLIB.Ros | null>(null);
  const [ros, setRos] = useState<ROSLIB.Ros | null>(null);
  const [rosConnected, setRosConnected] = useState(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [profileId, setProfileIdState] = useState<string>(
    () => (typeof window !== 'undefined' ? localStorage.getItem(PROFILE_STORAGE_KEY) : null) ?? DEFAULT_PROFILE_ID
  );

  const [allOverrides, setAllOverrides] = useState<Record<string, TopicOverrides>>(
    () => (typeof window !== 'undefined' ? loadAllOverrides() : {})
  );

  const baseProfile = findProfile(profileId);
  const topicOverrides = allOverrides[profileId] ?? {};
  const robotProfile = applyOverrides(baseProfile, topicOverrides);

  useEffect(() => {
    const instance = new ROSLIB.Ros({ url: buildUrl(hostnameRef.current) });
    rosRef.current = instance;
    setRos(instance);

    const scheduleReconnect = () => {
      if (reconnectTimerRef.current !== null) return; // already scheduled
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        instance.connect(buildUrl(hostnameRef.current));
      }, 3000);
    };

    instance.on('connection', () => setRosConnected(true));
    instance.on('close', () => {
      setRosConnected(false);
      scheduleReconnect();
    });
    instance.on('error', () => {
      setRosConnected(false);
      scheduleReconnect();
    });

    return () => {
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, []);

  const setHostname = (host: string) => {
    localStorage.setItem(STORAGE_KEY, host);
    hostnameRef.current = host;
    setHostnameState(host);
    setRosConnected(false);
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    rosRef.current?.connect(buildUrl(host));
  };

  const setRobotProfileId = (id: string) => {
    localStorage.setItem(PROFILE_STORAGE_KEY, id);
    setProfileIdState(id);
  };

  const setTopicOverrides = (overrides: TopicOverrides) => {
    const next = { ...allOverrides, [profileId]: overrides };
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(next));
    setAllOverrides(next);
  };

  const resetTopicOverrides = () => {
    const next = { ...allOverrides };
    delete next[profileId];
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(next));
    setAllOverrides(next);
  };

  return (
    <RosContext.Provider value={{
      ros, rosConnected, hostname, setHostname,
      robotProfile, setRobotProfileId,
      topicOverrides, setTopicOverrides, resetTopicOverrides,
    }}>
      {children}
    </RosContext.Provider>
  );
}

export function useRos() {
  return useContext(RosContext);
}
