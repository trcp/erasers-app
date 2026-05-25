import { useCallback } from 'react'
import ROSLIB from 'roslib'
import { useRos } from '../context/RosContext'

export function useRosService(name, serviceType) {
  const { ros, status } = useRos()

  const call = useCallback((requestData) => {
    return new Promise((resolve, reject) => {
      if (!ros.current || status !== 'connected') {
        reject(new Error('rosbridge not connected'))
        return
      }
      const service = new ROSLIB.Service({ ros: ros.current, name, serviceType })
      const req = new ROSLIB.ServiceRequest(requestData)
      service.callService(req, resolve, reject)
    })
  }, [name, serviceType, status])

  return { call }
}
