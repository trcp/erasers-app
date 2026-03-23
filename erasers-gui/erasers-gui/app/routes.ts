import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("taskstarter", "routes/taskstarter.tsx"),
  route("controller", "routes/controller.tsx"),
  route("data", "routes/data.tsx"),
  route("mapcreator", "routes/mapcreator.tsx"),
] satisfies RouteConfig;
