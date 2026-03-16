import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  optimizeDeps: {
    include: ["roslib"],
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
