import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import ROSLIB from 'roslib'

export const RosContext = createContext(null)

export function RosProvider({ config, children }) {
  const rosRef = useRef(null)
  const [status, setStatus] = useState('disconnected')

  const connect = useCallback((cfg) => {
    if (rosRef.current) {
      try { rosRef.current.close() } catch (_) {}
      rosRef.current = null
    }
    const url = `${cfg.ssl ? 'wss' : 'ws'}://${cfg.host}:${cfg.port}`
    setStatus('connecting')
    const ros = new ROSLIB.Ros({ url })
    ros.on('connection', () => setStatus('connected'))
    ros.on('error',      () => setStatus('error'))
    ros.on('close',      () => setStatus('disconnected'))
    rosRef.current = ros
  }, [])

  useEffect(() => {
    connect(config)
    return () => {
      if (rosRef.current) {
        try { rosRef.current.close() } catch (_) {}
      }
    }
  }, [config.host, config.port, config.ssl])

  return (
    <RosContext.Provider value={{ ros: rosRef, status, connect }}>
      {children}
    </RosContext.Provider>
  )
}

export function useRos() {
  return useContext(RosContext)
}
