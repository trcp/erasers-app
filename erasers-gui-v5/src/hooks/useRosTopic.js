import { useEffect, useRef, useState, useCallback } from 'react'
import ROSLIB from 'roslib'
import { useRos } from '../context/RosContext'

export function useRosTopic(name, messageType, mode = 'subscribe', throttleRate = 0) {
  const { ros, status } = useRos()
  const topicRef = useRef(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (!ros.current || status !== 'connected') {
      topicRef.current = null
      return
    }
    const topic = new ROSLIB.Topic({
      ros: ros.current,
      name,
      messageType,
      throttle_rate: throttleRate,
    })
    topicRef.current = topic

    if (mode === 'subscribe') {
      topic.subscribe((msg) => setMessage(msg))
    }

    return () => {
      if (mode === 'subscribe') {
        try { topic.unsubscribe() } catch (_) {}
      }
      topicRef.current = null
    }
  }, [name, messageType, mode, status])

  const publish = useCallback((msgData) => {
    if (!topicRef.current) return
    topicRef.current.publish(new ROSLIB.Message(msgData))
  }, [])

  return mode === 'subscribe' ? { message } : { publish }
}
