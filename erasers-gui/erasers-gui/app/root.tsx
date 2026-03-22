import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";

import type { Route } from "./+types/root";
import "./globals.css";
import MapCreator from "~/routes/mapcreator";

import createCache from "@emotion/cache";
import { RosProvider } from "~/scripts/ros";
import { TaskStarterProvider } from "~/scripts/taskstarter_context";
import { CacheProvider } from "@emotion/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const emotionCache = createCache({ key: "css" });

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1565C0' },
    secondary: { main: '#E65100' },
    error: { main: '#C62828' },
    success: { main: '#2E7D32' },
    background: { default: '#F0F4F8', paper: '#FFFFFF' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { minHeight: 48, minWidth: 48 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { minHeight: 48 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
  },
});

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        <title>eR@sers gui</title>
        <Meta />
        <Links />
      </head>
      <body>
        <CacheProvider value={emotionCache}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <RosProvider>
              <TaskStarterProvider>
                {children}
              </TaskStarterProvider>
            </RosProvider>
          </ThemeProvider>
        </CacheProvider>
        <ScrollRestoration />
        <script src="/easeljs.js" />
        <script src="/eventemitter2.js" />
        <script src="/roslib.js" />
        <script src="/ros2d.js" />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const location = useLocation();
  const isMapPage = location.pathname === '/mapcreator';
  return (
    <>
      <div style={{ display: isMapPage ? 'flex' : 'none', height: '100vh', width: '100%', flexDirection: 'column', overflow: 'hidden' }}>
        <MapCreator />
      </div>
      {!isMapPage && <Outlet />}
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main style={{ padding: "1rem" }}>
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre style={{ overflowX: "auto" }}>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
