import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const roslibBrowserPlugin = {
  name: 'roslib-browser',
  // Fix: Rollup's CJS transform converts `this` to the uninitialized exports var,
  // making `this.ROSLIB` throw. Replace with `undefined` so it falls through to
  // the default `{ REVISION: '1.4.1' }`.
  transform(code, id) {
    if (id.includes('roslib/src/RosLib.js')) {
      return { code: code.replace('this.ROSLIB', 'undefined'), map: null }
    }
  },
  // Fix: alias `ws` to a virtual CJS module using native WebSocket.
  resolveId(id) {
    if (id === 'ws') return '\0ws-browser-shim'
  },
  load(id) {
    if (id === '\0ws-browser-shim') return 'module.exports = globalThis.WebSocket'
  },
}

export default defineConfig({
  plugins: [react(), roslibBrowserPlugin],
  resolve: {
    alias: {
      'roslib': resolve('./node_modules/roslib/src/RosLib.js'),
    }
  },
})
