import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useRos } from '~/scripts/ros';
import ROSLIB from 'roslib';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import HomeIcon from '@mui/icons-material/Home';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import BarChartIcon from '@mui/icons-material/BarChart';
import MapIcon from '@mui/icons-material/Map';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import WifiIcon from '@mui/icons-material/Wifi';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';

const DRAWER_WIDTH = 80;

const navItems = [
  { icon: <HomeIcon />, label: 'Home', path: '/' },
  { icon: <AssignmentIcon />, label: 'Tasks', path: '/taskstarter' },
  { icon: <SportsEsportsIcon />, label: 'Control', path: '/controller' },
  { icon: <BarChartIcon />, label: 'Data', path: '/data' },
  { icon: <MapIcon />, label: 'Map', path: '/mapcreator' },
];

const HOST_CANDIDATES = [
  'localhost',
  '192.168.11.80',
  '192.168.11.33',
  '192.168.11.68',
];

interface AppLayoutProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function AppLayout({ children, defaultOpen = true }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(defaultOpen);
  const { ros, rosConnected, hostname, setHostname } = useRos();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState(hostname);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  useEffect(() => {
    if (!ros) return;
    const batterySub = new ROSLIB.Topic({ ros, name: '/hsrb/battery_state', messageType: 'tmc_msgs/BatteryState' });
    batterySub.subscribe((message: any) => {
      const level = message?.power ?? null;
      if (level !== null) setBatteryLevel(Math.round(Number(level)));
    });
    return () => batterySub.unsubscribe();
  }, [ros]);


  const handleOpenDialog = () => {
    setInputValue(hostname);
    setDialogOpen(true);
  };

  const handleConnect = () => {
    const trimmed = inputValue.trim();
    if (trimmed) setHostname(trimmed);
    setDialogOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>

      {/* Floating open button — visible only when sidebar is closed */}
      {!open && (
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 16,
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

        {/* Battery level */}
        <Tooltip title={batteryLevel !== null ? `Battery: ${batteryLevel}%` : 'Battery: N/A'} placement="right">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pb: 1 }}>
            <BatteryFullIcon sx={{ fontSize: '1.2rem', color: batteryLevel !== null && batteryLevel < 20 ? '#f44336' : 'rgba(255,255,255,0.85)' }} />
            <Typography sx={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.7)' }}>
              {batteryLevel !== null ? `${batteryLevel}%` : '--'}
            </Typography>
          </Box>
        </Tooltip>


        {/* ROS connection indicator (clickable) */}
        <Tooltip title="ROS Settings" placement="right">
          <Box
            onClick={handleOpenDialog}
            sx={{
              pb: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              borderRadius: 2,
              px: 1,
              py: 0.5,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
            }}
          >
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
        </Tooltip>
      </Drawer>

      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'margin 0.2s ease' }}>
        {children}
      </Box>

      {/* ROS Settings Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WifiIcon fontSize="small" />
          ROS Connection Settings
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Current: <code>{hostname}</code> — {rosConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </Typography>

          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Candidates
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {HOST_CANDIDATES.map((h) => (
              <Chip
                key={h}
                label={h}
                size="small"
                variant={inputValue === h ? 'filled' : 'outlined'}
                color={inputValue === h ? 'primary' : 'default'}
                onClick={() => setInputValue(h)}
              />
            ))}
          </Box>

          <TextField
            label="Hostname / IP Address"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(); }}
            fullWidth
            size="small"
            placeholder="e.g. 192.168.1.100"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConnect}>Connect</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
