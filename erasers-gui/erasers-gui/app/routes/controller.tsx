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
    Chip,
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
        <Card elevation={2} sx={{ width: 500 }}>
            <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    {pubFunc.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {pubFunc.messageType}
                </Typography>
                <Box sx={{ overflow: 'auto', maxHeight: 280 }}>
                    <TField data={msg} />
                </Box>
            </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1 }}>
                <Button size="small" variant="outlined">Reset</Button>
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

    // Arm tab state
    const [armJoints, setArmJoints] = useState({ arm_lift: 0.0, arm_flex: 0.0, arm_roll: 0.0, wrist_flex: -1.57, wrist_roll: 0.0 });
    const [gripperPos, setGripperPos] = useState(0.5);
    const [headJoints, setHeadJoints] = useState({ pan: 0.0, tilt: 0.0 });
    const [motionTime, setMotionTime] = useState(3.0);
    const [armStatus, setArmStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');

    const armAcRef = useRef<ROSLIB.ActionClient | null>(null);
    const gripperAcRef = useRef<ROSLIB.ActionClient | null>(null);
    const headAcRef = useRef<ROSLIB.ActionClient | null>(null);

    // Reset ActionClients when ros changes
    useEffect(() => {
        armAcRef.current = null;
        gripperAcRef.current = null;
        headAcRef.current = null;
    }, [ros]);

    const PRESET_GO      = { arm_lift: 0.0, arm_flex: 0.0, arm_roll: -1.57, wrist_flex: -1.57, wrist_roll: 0.0 };
    const PRESET_NEUTRAL = { arm_lift: 0.0, arm_flex: 0.0,  arm_roll: 0.0,   wrist_flex: -1.57, wrist_roll: 0.0 };

    const sendArmTrajectory = (joints = armJoints) => {
        if (!ros) return;
        if (!armAcRef.current) {
            armAcRef.current = new ROSLIB.ActionClient({
                ros,
                serverName: '/hsrb/arm_trajectory_controller/follow_joint_trajectory',
                actionName: 'control_msgs/FollowJointTrajectoryAction',
            });
        }
        const goal = new ROSLIB.Goal({
            actionClient: armAcRef.current,
            goalMessage: {
                trajectory: {
                    joint_names: ['arm_lift_joint', 'arm_flex_joint', 'arm_roll_joint', 'wrist_flex_joint', 'wrist_roll_joint'],
                    points: [{
                        positions: [joints.arm_lift, joints.arm_flex, joints.arm_roll, joints.wrist_flex, joints.wrist_roll],
                        velocities: [0, 0, 0, 0, 0],
                        time_from_start: { secs: Math.floor(motionTime), nsecs: 0 },
                    }],
                },
            },
        });
        goal.on('result', () => setArmStatus('done'));
        goal.on('feedback', () => setArmStatus('running'));
        setArmStatus('running');
        goal.send();
    };

    const sendGripperTrajectory = (pos = gripperPos) => {
        if (!ros) return;
        if (!gripperAcRef.current) {
            gripperAcRef.current = new ROSLIB.ActionClient({
                ros,
                serverName: '/hsrb/gripper_controller/follow_joint_trajectory',
                actionName: 'control_msgs/FollowJointTrajectoryAction',
            });
        }
        const goal = new ROSLIB.Goal({
            actionClient: gripperAcRef.current,
            goalMessage: {
                trajectory: {
                    joint_names: ['hand_motor_joint'],
                    points: [{
                        positions: [pos],
                        velocities: [0],
                        time_from_start: { secs: Math.floor(motionTime), nsecs: 0 },
                    }],
                },
            },
        });
        goal.send();
    };

    const sendHeadTrajectory = (joints = headJoints) => {
        if (!ros) return;
        if (!headAcRef.current) {
            headAcRef.current = new ROSLIB.ActionClient({
                ros,
                serverName: '/hsrb/head_trajectory_controller/follow_joint_trajectory',
                actionName: 'control_msgs/FollowJointTrajectoryAction',
            });
        }
        const goal = new ROSLIB.Goal({
            actionClient: headAcRef.current,
            goalMessage: {
                trajectory: {
                    joint_names: ['head_pan_joint', 'head_tilt_joint'],
                    points: [{
                        positions: [joints.pan, joints.tilt],
                        velocities: [0, 0],
                        time_from_start: { secs: Math.floor(motionTime), nsecs: 0 },
                    }],
                },
            },
        });
        goal.send();
    };

    const cancelArm = () => {
        if (!ros) return;
        const cancelTopic = new ROSLIB.Topic({
            ros,
            name: '/hsrb/arm_trajectory_controller/follow_joint_trajectory/cancel',
            messageType: 'actionlib_msgs/GoalID',
        });
        cancelTopic.publish(new ROSLIB.Message({}));
        setArmStatus('idle');
    };

    const armStatusColor = armStatus === 'running' ? 'primary' : armStatus === 'done' ? 'success' : armStatus === 'error' ? 'error' : 'default';

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

                <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                        <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                            {/* Existing topic cards */}
                            <CardTemplate msg={twist} pubFunc={cmdVelRef.current} />
                            <CardTemplate msg={pose_stamped} pubFunc={nav2d.current} />
                            <CardTemplate msg={voice} pubFunc={ttsus.current} />

                            {/* Arm Joints */}
                            <Card elevation={2} sx={{ width: 500 }}>
                                <CardContent>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Arm Joints</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        control_msgs/FollowJointTrajectoryAction
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Typography variant="body2">Motion Time:</Typography>
                                        <TextField
                                            size="small"
                                            type="number"
                                            value={motionTime}
                                            onChange={(e) => setMotionTime(Number(e.target.value))}
                                            inputProps={{ min: 0.1, step: 0.5 }}
                                            sx={{ width: 80 }}
                                        />
                                        <Typography variant="body2">s</Typography>
                                    </Box>
                                    {([
                                        { key: 'arm_lift',   label: 'arm_lift',   min: 0.00,  max: 0.69, step: 0.01, unit: 'm' },
                                        { key: 'arm_flex',   label: 'arm_flex',   min: -2.62, max: 0.00, step: 0.01, unit: 'rad' },
                                        { key: 'arm_roll',   label: 'arm_roll',   min: -2.09, max: 3.84, step: 0.01, unit: 'rad' },
                                        { key: 'wrist_flex', label: 'wrist_flex', min: -1.92, max: 1.22, step: 0.01, unit: 'rad' },
                                        { key: 'wrist_roll', label: 'wrist_roll', min: -1.92, max: 3.84, step: 0.01, unit: 'rad' },
                                    ] as const).map(({ key, label, min, max, step, unit }) => (
                                        <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                            <Typography variant="body2" sx={{ width: 90, flexShrink: 0 }}>{label}</Typography>
                                            <Slider
                                                value={armJoints[key]}
                                                min={min} max={max} step={step}
                                                onChange={(_e, v) => setArmJoints(prev => ({ ...prev, [key]: v as number }))}
                                                sx={{ flex: 1 }}
                                            />
                                            <Typography variant="body2" sx={{ width: 80, textAlign: 'right', flexShrink: 0 }}>
                                                {armJoints[key].toFixed(2)} {unit}
                                            </Typography>
                                        </Box>
                                    ))}
                                </CardContent>
                                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1, gap: 0.5, flexWrap: 'wrap' }}>
                                    <Button size="small" variant="outlined" onClick={() => setArmJoints(PRESET_GO)}>To Go</Button>
                                    <Button size="small" variant="outlined" onClick={() => setArmJoints(PRESET_NEUTRAL)}>To Neutral</Button>
                                    <Button size="small" variant="outlined" color="error" onClick={cancelArm}>Cancel</Button>
                                    <Button size="small" variant="contained" onClick={() => sendArmTrajectory()}>Send Arm</Button>
                                    <Chip label={armStatus} color={armStatusColor} size="small" />
                                </CardActions>
                            </Card>

                            {/* Gripper */}
                            <Card elevation={2} sx={{ width: 500 }}>
                                <CardContent>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Gripper</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        control_msgs/FollowJointTrajectoryAction
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2" sx={{ width: 90, flexShrink: 0 }}>hand_motor</Typography>
                                        <Slider
                                            value={gripperPos}
                                            min={0.0} max={1.23} step={0.01}
                                            onChange={(_e, v) => setGripperPos(v as number)}
                                            sx={{ flex: 1 }}
                                        />
                                        <Typography variant="body2" sx={{ width: 60, textAlign: 'right', flexShrink: 0 }}>
                                            {gripperPos.toFixed(2)}
                                        </Typography>
                                    </Box>
                                </CardContent>
                                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1 }}>
                                    <Button size="small" variant="outlined" onClick={() => { setGripperPos(1.23); sendGripperTrajectory(1.23); }}>Open</Button>
                                    <Button size="small" variant="outlined" onClick={() => { setGripperPos(0.0); sendGripperTrajectory(0.0); }}>Close</Button>
                                    <Button size="small" variant="contained" onClick={() => sendGripperTrajectory()}>Send Gripper</Button>
                                </CardActions>
                            </Card>

                            {/* Head */}
                            <Card elevation={2} sx={{ width: 500 }}>
                                <CardContent>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Head</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        control_msgs/FollowJointTrajectoryAction
                                    </Typography>
                                    {([
                                        { key: 'pan',  label: 'pan',  min: -3.84, max: 1.75, step: 0.01 },
                                        { key: 'tilt', label: 'tilt', min: -0.61, max: 0.35, step: 0.01 },
                                    ] as const).map(({ key, label, min, max, step }) => (
                                        <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                            <Typography variant="body2" sx={{ width: 90, flexShrink: 0 }}>{label}</Typography>
                                            <Slider
                                                value={headJoints[key]}
                                                min={min} max={max} step={step}
                                                onChange={(_e, v) => setHeadJoints(prev => ({ ...prev, [key]: v as number }))}
                                                sx={{ flex: 1 }}
                                            />
                                            <Typography variant="body2" sx={{ width: 80, textAlign: 'right', flexShrink: 0 }}>
                                                {headJoints[key].toFixed(2)} rad
                                            </Typography>
                                        </Box>
                                    ))}
                                </CardContent>
                                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1 }}>
                                    <Button size="small" variant="outlined" onClick={() => {
                                        const zero = { pan: 0.0, tilt: 0.0 };
                                        setHeadJoints(zero);
                                        sendHeadTrajectory(zero);
                                    }}>Reset Zero</Button>
                                    <Button size="small" variant="contained" onClick={() => sendHeadTrajectory()}>Send Head</Button>
                                </CardActions>
                            </Card>
                        </Box>
                    </TabPanel>
                </Box>
            </Box>
        </AppLayout>
    );
}
