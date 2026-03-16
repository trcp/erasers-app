import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useRos } from '~/scripts/ros';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import BarChartIcon from '@mui/icons-material/BarChart';
import MapIcon from '@mui/icons-material/Map';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

const DRAWER_WIDTH = 80;

const navItems = [
  { icon: <HomeIcon />, label: 'Home', path: '/' },
  { icon: <AssignmentIcon />, label: 'Tasks', path: '/taskstarter' },
  { icon: <SportsEsportsIcon />, label: 'Control', path: '/controller' },
  { icon: <BarChartIcon />, label: 'Data', path: '/data' },
  { icon: <MapIcon />, label: 'Map', path: '/mapcreator' },
];

interface AppLayoutProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function AppLayout({ children, defaultOpen = true }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(defaultOpen);
  const { rosConnected } = useRos();

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>

      {/* Floating open button — visible only when sidebar is closed */}
      {!open && (
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            top: 8,
            left: 8,
            zIndex: 1300,
            bgcolor: '#1565C0',
            color: '#fff',
            width: 40,
            height: 40,
            boxShadow: 3,
            '&:hover': { bgcolor: '#1976D2' },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      <Drawer
        variant="permanent"
        sx={{
          width: open ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: '#1565C0',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: 'none',
            overflowX: 'hidden',
            transform: open ? 'translateX(0)' : `translateX(-${DRAWER_WIDTH}px)`,
            transition: 'transform 0.2s ease',
          },
        }}
      >
        {/* Close button at top of sidebar */}
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', pt: 0.5, pr: 0.5 }}>
          <IconButton onClick={() => setOpen(false)} size="small" sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}>
            <ChevronLeftIcon />
          </IconButton>
        </Box>

        {/* Nav items */}
        <Box sx={{ flex: 1, width: '100%' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Tooltip key={item.path} title={item.label} placement="right">
                <Box
                  onClick={() => navigate(item.path)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 1.5,
                    px: 0.5,
                    cursor: 'pointer',
                    bgcolor: isActive ? '#FFFFFF' : 'transparent',
                    borderRadius: 2,
                    mx: 0.5,
                    mb: 0.5,
                    color: isActive ? '#1565C0' : '#FFFFFF',
                    transition: 'background-color 0.15s',
                    '&:hover': {
                      bgcolor: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
                    },
                    '& .MuiSvgIcon-root': { fontSize: '1.4rem' },
                  }}
                >
                  {item.icon}
                  <Typography
                    variant="caption"
                    sx={{ fontSize: '0.6rem', mt: 0.5, textAlign: 'center', lineHeight: 1.1, color: 'inherit' }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        {/* ROS connection indicator */}
        <Box sx={{ pb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: rosConnected ? '#4CAF50' : '#f44336',
              mb: 0.5,
              boxShadow: rosConnected
                ? '0 0 6px rgba(76,175,80,0.8)'
                : '0 0 6px rgba(244,67,54,0.8)',
            }}
          />
          <Typography sx={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.7)' }}>
            ROS
          </Typography>
        </Box>
      </Drawer>

      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'margin 0.2s ease' }}>
        {children}
      </Box>
    </Box>
  );
}
