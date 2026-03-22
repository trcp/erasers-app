import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Typography,
    Card,
    CardContent,
    Box,
    CardActions,
    Button,
    Grid,
    TextField,
    Tabs,
    Tab,
    Slider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AppLayout from '~/components/AppLayout';
import VirtualJoystick from '~/components/joystick/VirtualJoystick';
import GamepadController from '~/components/joystick/GamepadController';

import ROSLIB from 'roslib';
import { useRos } from '~/scripts/ros';

const TField = ({ data, allKeys = [] }) => {
    const packData = (e, k) => {
        data[k] = Number(e.target.value);
    };

    return (
        <>
            {Object.keys(data).map((k, ind) => {
                if (k !== 'header') {
                    if (typeof data[k] === 'object') {
                        return (
                            <Box key={ind}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', marginBottom: '4px' }}>{k}</Typography>
                                <TField data={data[k]} allKeys={[...allKeys, k]} />
                            </Box>
                        );
                    } else {
                        return (
                            <Box key={ind} style={{ marginBottom: '8px' }}>
                                <Box sx={{ display: "flex" }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', marginRight: '4px', pr: 2 }}>{k}:</Typography>
                                    <TextField onChange={(e) => packData(e, k)} variant="outlined" size="small" defaultValue={data[k]} />
                                </Box>
                            </Box>
                        );
                    }
                }
                return null;
            })}
        </>
    );
};

const CardTemplate = ({ msg, pubFunc }) => {
    const pubMsg = (m) => {
        pubFunc.publish(m);
    };

    return (
        <Card elevation={2} sx={{ width: '500px', height: '400px', margin: '8px', position: 'relative' }}>
            <Box sx={{ overflow: 'auto', maxHeight: '85%' }}>
                <CardContent>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '14px', marginBottom: '8px' }}>
                        {pubFunc.name} : {pubFunc.messageType}
                    </Typography>
                    <Box>
                        <TField data={msg} />
                    </Box>
                </CardContent>
            </Box>
            <CardActions sx={{ position: 'absolute', bottom: 0, right: 0 }}>
                <Button size="small" variant="contained" sx={{ marginRight: '8px' }}>Reset</Button>
                <Button size="small" variant="contained" onClick={() => pubMsg(msg)}>Publish</Button>
            </CardActions>
        </Card>
    );
};

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`controller-tabpanel-${index}`}
            aria-labelledby={`controller-tab-${index}`}
            style={value === index ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } : undefined}
            {...other}
        >
            {value === index && children}
        </div>
    );
}

export default function Controller() {
    const { ros } = useRos();
    const cmdVelRef = useRef<ROSLIB.Topic | null>(null);
    const nav2d = useRef<ROSLIB.Topic | null>(null);
    const ttsus = useRef<ROSLIB.Topic | null>(null);

    if (ros) {
        if (!cmdVelRef.current) {
            cmdVelRef.current = new ROSLIB.Topic({
                ros,
                name: '/hsrb/command_velocity',
                messageType: 'geometry_msgs/Twist'
            });
        }
        if (!nav2d.current) {
            nav2d.current = new ROSLIB.Topic({
                ros,
                name: '/goal',
                messageType: 'geometry_msgs/PoseStamped'
            });
        }
        if (!ttsus.current) {
            ttsus.current = new ROSLIB.Topic({
                ros,
                name: '/talk_request',
                messageType: 'tmc_msgs/Voice'
            });
        }
    }

    const twist = new ROSLIB.Message({
        linear: { x: 0.0, y: 0.0, z: 0.0 },
        angular: { x: 0.0, y: 0.0, z: 0.0 }
    });
    const pose_stamped = new ROSLIB.Message({
        header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: "map" },
        pose: {
            position: { x: 0.0, y: 0.0, z: 0.0 },
            orientation: { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }
        }
    });
    const voice = new ROSLIB.Message({
        interrupting: false, queueing: false, language: 0, sentence: 'hello'
    });

    const [tabValue, setTabValue] = useState(0);
    const [linearScale, setLinearScale] = useState(0.5);
    const [lateralScale, setLateralScale] = useState(0.5);
    const [angularScale, setAngularScale] = useState(1.0);

    const velRef = useRef({ lx: 0, ly: 0, az: 0 });
    const publishIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        publishIntervalRef.current = setInterval(() => {
            if (!cmdVelRef.current) return;
            const { lx, ly, az } = velRef.current;
            cmdVelRef.current.publish(new ROSLIB.Message({
                linear:  { x: lx, y: ly, z: 0.0 },
                angular: { x: 0.0, y: 0.0, z: az }
            }));
        }, 50);
        return () => {
            if (publishIntervalRef.current) clearInterval(publishIntervalRef.current);
        };
    }, []);

    const scaleRefs = useRef({ linearScale, lateralScale, angularScale });
    useEffect(() => {
        scaleRefs.current = { linearScale, lateralScale, angularScale };
    }, [linearScale, lateralScale, angularScale]);

    const handleLeftMove = useCallback((joyX: number, joyY: number) => {
        velRef.current.lx =  joyY * scaleRefs.current.linearScale;
        velRef.current.ly = -joyX * scaleRefs.current.lateralScale;
    }, []);

    const handleLeftStop = useCallback(() => {
        velRef.current.lx = 0;
        velRef.current.ly = 0;
    }, []);

    const handleRightMove = useCallback((joyX: number, _joyY: number) => {
        velRef.current.az = -joyX * scaleRefs.current.angularScale;
    }, []);

    const handleRightStop = useCallback(() => {
        velRef.current.az = 0;
    }, []);

    return (
        <AppLayout>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header */}
                <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1565C0' }}>Robot Controller</Typography>
                </Box>

                <Box sx={{ flex: 1, overflowX: 'hidden', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ px: 2, pt: 1 }}>
                        <Tabs
                            value={tabValue}
                            onChange={(_e, v) => setTabValue(v)}
                            aria-label="controller tabs"
                            sx={{
                                '& .MuiTab-root': { borderRadius: '8px 8px 0 0' },
                                '& .Mui-selected': { bgcolor: 'primary.main', color: '#fff !important' },
                                '& .MuiTabs-indicator': { display: 'none' },
                            }}
                        >
                            <Tab label="Joystick" id="controller-tab-0" aria-controls="controller-tabpanel-0" />
                            <Tab label="Advanced" id="controller-tab-1" aria-controls="controller-tabpanel-1" />
                        </Tabs>
                    </Box>

                    <TabPanel value={tabValue} index={0}>
                        <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 1 }}>
                            {/* Gamepad status */}
                            <GamepadController
                                cmdVel={cmdVelRef.current!}
                                linearScale={linearScale}
                                lateralScale={lateralScale}
                                angularScale={angularScale}
                            />

                            {/* Velocity Settings collapsed by default */}
                            <Accordion disableGutters elevation={2}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1565C0' }}>
                                        Velocity Settings
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Typography gutterBottom variant="body2">Linear (前後): {linearScale.toFixed(2)} m/s</Typography>
                                    <Slider value={linearScale} onChange={(_e, v) => setLinearScale(v as number)}
                                        min={0} max={1.0} step={0.05} marks valueLabelDisplay="auto" />
                                    <Typography gutterBottom variant="body2" sx={{ mt: 1 }}>Lateral (横移動): {lateralScale.toFixed(2)} m/s</Typography>
                                    <Slider value={lateralScale} onChange={(_e, v) => setLateralScale(v as number)}
                                        min={0} max={1.0} step={0.05} marks valueLabelDisplay="auto" />
                                    <Typography gutterBottom variant="body2" sx={{ mt: 1 }}>Angular (回転): {angularScale.toFixed(2)} rad/s</Typography>
                                    <Slider value={angularScale} onChange={(_e, v) => setAngularScale(v as number)}
                                        min={0} max={2.0} step={0.1} marks valueLabelDisplay="auto" />
                                </AccordionDetails>
                            </Accordion>

                            {/* Dual virtual joysticks — fill remaining height */}
                            <Box sx={{ flex: 1, display: 'flex', gap: 2, minHeight: 0 }}>
                                <Box sx={{ flex: 1, position: 'relative' }}>
                                    <VirtualJoystick
                                        onMove={handleLeftMove}
                                        onStop={handleLeftStop}
                                        label="並進 (Linear X/Y)"
                                        color="red"
                                    />
                                </Box>
                                <Box sx={{ flex: 1, position: 'relative' }}>
                                    <VirtualJoystick
                                        onMove={handleRightMove}
                                        onStop={handleRightStop}
                                        label="回転 (Angular Z)"
                                        color="blue"
                                    />
                                </Box>
                            </Box>
                        </Box>
                    </TabPanel>

                    <TabPanel value={tabValue} index={1}>
                        <Grid container spacing={1} columns={4} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                            <Grid>
                                <CardTemplate msg={twist} pubFunc={cmdVelRef.current} />
                            </Grid>
                            <Grid>
                                <CardTemplate msg={pose_stamped} pubFunc={nav2d.current} />
                            </Grid>
                            <Grid>
                                <CardTemplate msg={voice} pubFunc={ttsus.current} />
                            </Grid>
                        </Grid>
                    </TabPanel>
                </Box>
            </Box>
        </AppLayout>
    );
}
