import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import ROSLIB from 'roslib'

export const RosContext = createContext(null)

export function RosProvider({ config, children }) {
  const rosRef     = useRef(null)
  const retryRef   = useRef(null)
  const genRef     = useRef(0)
  const configRef  = useRef(config)
  const connectRef = useRef(null)
  const [status, setStatus] = useState('disconnected')

  useEffect(() => { configRef.current = config }, [config])

  const clearRetry = useCallback(() => {
    if (retryRef.current) {
      clearTimeout(retryRef.current)
      retryRef.current = null
    }
  }, [])

  const connect = useCallback((cfg) => {
    clearRetry()
    if (rosRef.current) {
      try { rosRef.current.close() } catch (_) {}
      rosRef.current = null
    }
    const gen = ++genRef.current
    const url = `${cfg.ssl ? 'wss' : 'ws'}://${cfg.host}:${cfg.port}`
    setStatus('connecting')
    const ros = new ROSLIB.Ros({ url })
    ros.on('connection', () => {
      if (gen !== genRef.current) return
      setStatus('connected')
      clearRetry()
    })
    ros.on('error', () => {
      if (gen !== genRef.current) return
      setStatus('error')
    })
    ros.on('close', () => {
      if (gen !== genRef.current) return
      setStatus('disconnected')
      // 3秒後にリトライ
      retryRef.current = setTimeout(() => connectRef.current?.(configRef.current), 3000)
    })
    rosRef.current = ros
  }, [clearRetry])

  useEffect(() => { connectRef.current = connect }, [connect])

  // config(host/port/ssl)が変わったら既存接続を破棄して再接続
  useEffect(() => {
    connect(config)
    return () => {
      clearRetry()
      genRef.current++ // 保留中のリトライを無効化
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
