import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  resolve: {
    alias: {
      // roslib npm package uses `this.ROSLIB` which breaks under ESM strict mode.
      // Redirect to a shim that returns the global set by public/roslib.js.
      roslib: path.resolve(__dirname, "app/shims/roslib.ts"),
    },
  },
  ssr: {
    noExternal: [
      "@mui/material",
      "@mui/icons-material",
      "@mui/system",
      "@mui/utils",
      "@mui/base",
      "@mui/styled-engine",
      "@mui/private-theming",
      "@mui/joy",
      "@emotion/react",
      "@emotion/styled",
      "@emotion/cache",
      "@emotion/serialize",
      "@emotion/utils",
    ],
  },
});
