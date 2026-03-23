// public/roslib.js (loaded as a blocking <script> in root.tsx) sets window.ROSLIB.
// This shim re-exports that global so Vite does not bundle the roslib npm package,
// which uses `this.ROSLIB` — a pattern that breaks under ESM strict mode.
export default (globalThis as any).ROSLIB;
