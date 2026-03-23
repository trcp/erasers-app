import * as React from 'react';
import Box from '@mui/material/Box';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BadgeIcon from '@mui/icons-material/Badge';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import MapIcon from '@mui/icons-material/Map';
import { useRouter } from 'next/navigation'

const actions = [
    { icon: <AdminPanelSettingsIcon />, name: 'HSR Admin', url: 'http://hsrb80.local/admin' },
    { icon: <BadgeIcon />, name: 'HSR User', url: 'http://hsrb80.local/user' },
    { icon: <DashboardIcon />, name: 'Task Starter', url: '/dashboard' },
    { icon: <NewspaperIcon />, name: 'Data Viewer', url: '/data' },
    { icon: <SportsEsportsIcon />, name: 'Controller', url: '/controller' },
    { icon: <MapIcon />, name: 'Loccation', url: '/mapcreator' },
];

export default function BasicSpeedDial() {

    const router = useRouter();

    const buttonClick = (ac) => {
        console.log('hello click', ac);
        router.push(ac.url);
    };

    return (
        <Box sx={{ transform: 'translateZ(0px)', flexGrow: 1, position: 'fixed', bottom:10, right:10 }}>
            <SpeedDial
                ariaLabel="SpeedDial basic example"
                // sx={{ position: 'fixed', bottom: 0, right: 0 }}
                icon={<SpeedDialIcon />}
                FabProps={{
                    sx: {
                      bgcolor: 'red',
                      '&:hover': {
                        bgcolor: 'red',
                      }
                    }
                  }}
            >
                {actions.map((action) => (
                    <SpeedDialAction
                        key={action.name}
                        icon={action.icon}
                        tooltipTitle={action.name}
                        onClick={() => buttonClick(action)}
                    />
                ))}
            </SpeedDial>
        </Box>
    );
}