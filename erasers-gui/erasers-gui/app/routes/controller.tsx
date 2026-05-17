import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Typography,
    Card,
    CardContent,
    Box,
    CardActions,
    Button,
    TextField,
    Tabs,
    Tab,
    Slider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AppLayout from '~/components/AppLayout';
import VirtualJoystick from '~/components/joystick/VirtualJoystick';
import GamepadController from '~/components/joystick/GamepadController';

import ROSLIB from 'roslib';
import { useRos } from '~/scripts/ros';
import { ROBOT_PROFILES, type RobotProfile, type TopicOverrides } from '~/scripts/robotProfiles';

const TField = ({ data, allKeys = [] }) => {
    const packData = (e, k) => {
        data[k] = typeof data[k] === 'string' ? e.target.value : Number(e.target.value);
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

function toTopicInputs(profile: RobotProfile): Record<string, string> {
    return {
        cmdVelTopic:       profile.cmdVelTopic,
        navGoalTopic:      profile.navGoalTopic,
        ttsTopic:          profile.ttsTopic ?? '',
        batteryTopic:      profile.batteryTopic ?? '',
        armServerName:     profile.arm?.serverName ?? '',
        gripperServerName: profile.gripper?.serverName ?? '',
        headServerName:    profile.head?.serverName ?? '',
    };
}

export default function Controller() {
    const { ros, robotProfile, setRobotProfileId, setTopicOverrides, resetTopicOverrides } = useRos();
    const cmdVelRef = useRef<ROSLIB.Topic | null>(null);
    const nav2dRef = useRef<ROSLIB.Topic | null>(null);
    const ttsRef = useRef<ROSLIB.Topic | null>(null);

    // Recreate topics when ros connection or robot profile changes
    useEffect(() => {
        cmdVelRef.current = null;
        nav2dRef.current = null;
        ttsRef.current = null;
    }, [ros, robotProfile]);

    if (ros) {
        if (!cmdVelRef.current) {
            cmdVelRef.current = new ROSLIB.Topic({
                ros,
                name: robotProfile.cmdVelTopic,
                messageType: 'geometry_msgs/Twist'
            });
        }
        if (!nav2dRef.current) {
            nav2dRef.current = new ROSLIB.Topic({
                ros,
                name: robotProfile.navGoalTopic,
                messageType: 'geometry_msgs/PoseStamped'
            });
        }
        if (!ttsRef.current && robotProfile.ttsTopic) {
            ttsRef.current = new ROSLIB.Topic({
                ros,
                name: robotProfile.ttsTopic,
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

    const [topicInputs, setTopicInputs] = useState<Record<string, string>>(() => toTopicInputs(robotProfile));

    useEffect(() => {
        setTopicInputs(toTopicInputs(robotProfile));
    }, [robotProfile]);

    const setTopic = (key: string, value: string) =>
        setTopicInputs(prev => ({ ...prev, [key]: value }));

    const handleSaveTopics = () => {
        const overrides: TopicOverrides = {
            cmdVelTopic:       topicInputs.cmdVelTopic || undefined,
            navGoalTopic:      topicInputs.navGoalTopic || undefined,
            ttsTopic:          topicInputs.ttsTopic || undefined,
            batteryTopic:      topicInputs.batteryTopic || undefined,
            armServerName:     topicInputs.armServerName || undefined,
            gripperServerName: topicInputs.gripperServerName || undefined,
            headServerName:    topicInputs.headServerName || undefined,
        };
        setTopicOverrides(overrides);
    };

    const [linearScale, setLinearScale] = useState(0.5);
    const [lateralScale, setLateralScale] = useState(0.5);
    const [angularScale, setAngularScale] = useState(1.0);

    // Joint states initialized from robot profile
    const [armJoints, setArmJoints] = useState<Record<string, number>>(
        () => Object.fromEntries((robotProfile.arm?.joints ?? []).map(j => [j.key, j.defaultValue]))
    );
    const [gripperPos, setGripperPos] = useState(robotProfile.gripper?.defaultValue ?? 0.0);
    const [headJoints, setHeadJoints] = useState<Record<string, number>>(
        () => Object.fromEntries((robotProfile.head?.joints ?? []).map(j => [j.key, j.defaultValue]))
    );
    const [motionTime, setMotionTime] = useState(3.0);
    const [armStatus, setArmStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
    const [posePolicyStatus, setPosePolicyStatus] = useState<'idle' | 'calling' | 'done' | 'error'>('idle');
    const [posePolicyConfirm, setPosePolicyConfirm] = useState<string | null>(null);

    const armAcRef = useRef<ROSLIB.ActionClient | null>(null);
    const gripperAcRef = useRef<ROSLIB.ActionClient | null>(null);
    const headAcRef = useRef<ROSLIB.ActionClient | null>(null);

    // Reset ActionClients and joint states when ros or profile changes
    useEffect(() => {
        armAcRef.current = null;
        gripperAcRef.current = null;
        headAcRef.current = null;
        setArmJoints(Object.fromEntries((robotProfile.arm?.joints ?? []).map(j => [j.key, j.defaultValue])));
        setGripperPos(robotProfile.gripper?.defaultValue ?? 0.0);
        setHeadJoints(Object.fromEntries((robotProfile.head?.joints ?? []).map(j => [j.key, j.defaultValue])));
    }, [ros, robotProfile]);

    const sendArmTrajectory = (joints = armJoints) => {
        if (!ros || !robotProfile.arm) return;
        if (!armAcRef.current) {
            armAcRef.current = new ROSLIB.ActionClient({
                ros,
                serverName: robotProfile.arm.serverName,
                actionName: 'control_msgs/FollowJointTrajectoryAction',
            });
        }
        const goal = new ROSLIB.Goal({
            actionClient: armAcRef.current,
            goalMessage: {
                trajectory: {
                    joint_names: robotProfile.arm.joints.map(j => j.jointName),
                    points: [{
                        positions: robotProfile.arm.joints.map(j => joints[j.key] ?? j.defaultValue),
                        velocities: robotProfile.arm.joints.map(() => 0),
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
        if (!ros || !robotProfile.gripper) return;
        if (!gripperAcRef.current) {
            gripperAcRef.current = new ROSLIB.ActionClient({
                ros,
                serverName: robotProfile.gripper.serverName,
                actionName: 'control_msgs/FollowJointTrajectoryAction',
            });
        }
        const goal = new ROSLIB.Goal({
            actionClient: gripperAcRef.current,
            goalMessage: {
                trajectory: {
                    joint_names: [robotProfile.gripper.jointName],
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
        if (!ros || !robotProfile.head) return;
        if (!headAcRef.current) {
            headAcRef.current = new ROSLIB.ActionClient({
                ros,
                serverName: robotProfile.head.serverName,
                actionName: 'control_msgs/FollowJointTrajectoryAction',
            });
        }
        const goal = new ROSLIB.Goal({
            actionClient: headAcRef.current,
            goalMessage: {
                trajectory: {
                    joint_names: robotProfile.head.joints.map(j => j.jointName),
                    points: [{
                        positions: robotProfile.head.joints.map(j => joints[j.key] ?? j.defaultValue),
                        velocities: robotProfile.head.joints.map(() => 0),
                        time_from_start: { secs: Math.floor(motionTime), nsecs: 0 },
                    }],
                },
            },
        });
        goal.send();
    };

    const cancelArm = () => {
        if (!ros || !robotProfile.arm) return;
        const cancelTopic = new ROSLIB.Topic({
            ros,
            name: `${robotProfile.arm.serverName}/cancel`,
            messageType: 'actionlib_msgs/GoalID',
        });
        cancelTopic.publish(new ROSLIB.Message({}));
        setArmStatus('idle');
    };

    const armStatusColor = armStatus === 'running' ? 'primary' : armStatus === 'done' ? 'success' : armStatus === 'error' ? 'error' : 'default';

    const callPosePolicy = (pose: string) => {
        setPosePolicyConfirm(pose);
    };

    const confirmPosePolicy = () => {
        if (!ros || !robotProfile.posePolicy || !posePolicyConfirm) return;
        const pose = posePolicyConfirm;
        setPosePolicyConfirm(null);
        setPosePolicyStatus('calling');
        const svc = new ROSLIB.Service({
            ros,
            name: robotProfile.posePolicy.serviceName,
            serviceType: robotProfile.posePolicy.serviceType,
        });
        svc.callService(
            new ROSLIB.ServiceRequest({ pose }),
            () => setPosePolicyStatus('done'),
            () => setPosePolicyStatus('error'),
        );
    };

    const velRef = useRef({ lx: 0, ly: 0, az: 0 });
    const publishIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        publishIntervalRef.current = setInterval(() => {
            if (!cmdVelRef.current) return;
            const { lx, ly, az } = velRef.current;
            if (lx === 0 && ly === 0 && az === 0) return;
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
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1565C0' }}>
                        Robot Controller — {robotProfile.name}
                    </Typography>
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
                            <Tab label="Topics" id="controller-tab-2" aria-controls="controller-tabpanel-2" />
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
                            {/* Basic topic cards */}
                            {cmdVelRef.current && <CardTemplate msg={twist} pubFunc={cmdVelRef.current} />}
                            {nav2dRef.current && <CardTemplate msg={pose_stamped} pubFunc={nav2dRef.current} />}
                            {ttsRef.current && <CardTemplate msg={voice} pubFunc={ttsRef.current} />}

                            {/* Pose Policy — only shown when profile defines posePolicy */}
                            {robotProfile.posePolicy && (
                                <Card elevation={2} sx={{ width: 500 }}>
                                    <CardContent>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Pose Policy</Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            {robotProfile.posePolicy.serviceType}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {robotProfile.posePolicy.poses.map((pose) => (
                                                <Button
                                                    key={pose}
                                                    variant="outlined"
                                                    size="small"
                                                    disabled={posePolicyStatus === 'calling'}
                                                    onClick={() => callPosePolicy(pose)}
                                                >
                                                    {pose}
                                                </Button>
                                            ))}
                                        </Box>
                                        {posePolicyStatus !== 'idle' && (
                                            <Chip
                                                size="small"
                                                sx={{ mt: 1.5 }}
                                                label={posePolicyStatus}
                                                color={posePolicyStatus === 'done' ? 'success' : posePolicyStatus === 'error' ? 'error' : 'default'}
                                            />
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Arm Joints — only shown when profile defines arm */}
                            {robotProfile.arm && (
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
                                        {robotProfile.arm.joints.map(({ key, label, min, max, step, unit }) => (
                                            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                <Typography variant="body2" sx={{ width: 90, flexShrink: 0 }}>{label}</Typography>
                                                <Slider
                                                    value={armJoints[key] ?? 0}
                                                    min={min} max={max} step={step}
                                                    onChange={(_e, v) => setArmJoints(prev => ({ ...prev, [key]: v as number }))}
                                                    sx={{ flex: 1 }}
                                                />
                                                <Typography variant="body2" sx={{ width: 80, textAlign: 'right', flexShrink: 0 }}>
                                                    {(armJoints[key] ?? 0).toFixed(2)} {unit}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </CardContent>
                                    <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1, gap: 0.5, flexWrap: 'wrap' }}>
                                        {Object.entries(robotProfile.arm.presets ?? {}).map(([name, values]) => (
                                            <Button key={name} size="small" variant="outlined" onClick={() => setArmJoints(values)}>
                                                To {name.charAt(0).toUpperCase() + name.slice(1)}
                                            </Button>
                                        ))}
                                        <Button size="small" variant="outlined" color="error" onClick={cancelArm}>Cancel</Button>
                                        <Button size="small" variant="contained" onClick={() => sendArmTrajectory()}>Send Arm</Button>
                                        <Chip label={armStatus} color={armStatusColor} size="small" />
                                    </CardActions>
                                </Card>
                            )}

                            {/* Gripper — only shown when profile defines gripper */}
                            {robotProfile.gripper && (
                                <Card elevation={2} sx={{ width: 500 }}>
                                    <CardContent>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Gripper</Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            control_msgs/FollowJointTrajectoryAction
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body2" sx={{ width: 90, flexShrink: 0 }}>
                                                {robotProfile.gripper.jointName}
                                            </Typography>
                                            <Slider
                                                value={gripperPos}
                                                min={robotProfile.gripper.min}
                                                max={robotProfile.gripper.max}
                                                step={0.01}
                                                onChange={(_e, v) => setGripperPos(v as number)}
                                                sx={{ flex: 1 }}
                                            />
                                            <Typography variant="body2" sx={{ width: 60, textAlign: 'right', flexShrink: 0 }}>
                                                {gripperPos.toFixed(2)}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                    <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1 }}>
                                        <Button size="small" variant="outlined" onClick={() => { setGripperPos(robotProfile.gripper!.max); sendGripperTrajectory(robotProfile.gripper!.max); }}>Open</Button>
                                        <Button size="small" variant="outlined" onClick={() => { setGripperPos(robotProfile.gripper!.min); sendGripperTrajectory(robotProfile.gripper!.min); }}>Close</Button>
                                        <Button size="small" variant="contained" onClick={() => sendGripperTrajectory()}>Send Gripper</Button>
                                    </CardActions>
                                </Card>
                            )}

                            {/* Head — only shown when profile defines head */}
                            {robotProfile.head && (
                                <Card elevation={2} sx={{ width: 500 }}>
                                    <CardContent>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Head</Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            control_msgs/FollowJointTrajectoryAction
                                        </Typography>
                                        {robotProfile.head.joints.map(({ key, label, min, max, step }) => (
                                            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                <Typography variant="body2" sx={{ width: 90, flexShrink: 0 }}>{label}</Typography>
                                                <Slider
                                                    value={headJoints[key] ?? 0}
                                                    min={min} max={max} step={step}
                                                    onChange={(_e, v) => setHeadJoints(prev => ({ ...prev, [key]: v as number }))}
                                                    sx={{ flex: 1 }}
                                                />
                                                <Typography variant="body2" sx={{ width: 80, textAlign: 'right', flexShrink: 0 }}>
                                                    {(headJoints[key] ?? 0).toFixed(2)} rad
                                                </Typography>
                                            </Box>
                                        ))}
                                    </CardContent>
                                    <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1 }}>
                                        <Button size="small" variant="outlined" onClick={() => {
                                            const zero = Object.fromEntries(robotProfile.head!.joints.map(j => [j.key, 0.0]));
                                            setHeadJoints(zero);
                                            sendHeadTrajectory(zero);
                                        }}>Reset Zero</Button>
                                        <Button size="small" variant="contained" onClick={() => sendHeadTrajectory()}>Send Head</Button>
                                    </CardActions>
                                </Card>
                            )}
                        </Box>
                    </TabPanel>

                    <TabPanel value={tabValue} index={2}>
                        <Box sx={{ p: 2, overflowY: 'auto', flex: 1, minHeight: 0 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#1565C0' }}>
                                Robot Type
                            </Typography>
                            <Select
                                value={robotProfile.id}
                                onChange={(e) => setRobotProfileId(e.target.value)}
                                size="small"
                                fullWidth
                                sx={{ mb: 3 }}
                            >
                                {ROBOT_PROFILES.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                                ))}
                            </Select>

                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: '#1565C0' }}>
                                Topic Names
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                <TextField label="cmd_vel" size="small" fullWidth
                                    value={topicInputs.cmdVelTopic ?? ''}
                                    onChange={(e) => setTopic('cmdVelTopic', e.target.value)} />
                                <TextField label="nav goal" size="small" fullWidth
                                    value={topicInputs.navGoalTopic ?? ''}
                                    onChange={(e) => setTopic('navGoalTopic', e.target.value)} />
                                <TextField label="TTS (talk_request)" size="small" fullWidth
                                    value={topicInputs.ttsTopic ?? ''}
                                    onChange={(e) => setTopic('ttsTopic', e.target.value)} />
                                <TextField label="battery state" size="small" fullWidth
                                    value={topicInputs.batteryTopic ?? ''}
                                    onChange={(e) => setTopic('batteryTopic', e.target.value)} />
                                {robotProfile.arm && (
                                    <TextField label="arm action server" size="small" fullWidth
                                        value={topicInputs.armServerName ?? ''}
                                        onChange={(e) => setTopic('armServerName', e.target.value)} />
                                )}
                                {robotProfile.gripper && (
                                    <TextField label="gripper action server" size="small" fullWidth
                                        value={topicInputs.gripperServerName ?? ''}
                                        onChange={(e) => setTopic('gripperServerName', e.target.value)} />
                                )}
                                {robotProfile.head && (
                                    <TextField label="head action server" size="small" fullWidth
                                        value={topicInputs.headServerName ?? ''}
                                        onChange={(e) => setTopic('headServerName', e.target.value)} />
                                )}
                                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                    <Button size="small" variant="text" color="warning" onClick={resetTopicOverrides}>
                                        Reset to defaults
                                    </Button>
                                    <Button size="small" variant="contained" onClick={handleSaveTopics}>
                                        Save
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    </TabPanel>
                </Box>
            </Box>
            {/* Pose Policy Confirmation Dialog */}
            <Dialog open={posePolicyConfirm !== null} onClose={() => setPosePolicyConfirm(null)}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningAmberIcon color="warning" />
                    操作確認
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ポーズ <strong>"{posePolicyConfirm}"</strong> をロボットに送信します。<br />
                        本当に実行しますか？
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPosePolicyConfirm(null)}>キャンセル</Button>
                    <Button variant="contained" color="warning" onClick={confirmPosePolicy}>
                        送信する
                    </Button>
                </DialogActions>
            </Dialog>
        </AppLayout>
    );
}
