export interface JointConfig {
  key: string;
  jointName: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: 'rad' | 'm';
  defaultValue: number;
}

export interface ArmConfig {
  serverName: string;
  joints: JointConfig[];
  presets?: Record<string, Record<string, number>>;
}

export interface GripperConfig {
  serverName: string;
  jointName: string;
  min: number;
  max: number;
  defaultValue: number;
}

export interface HeadConfig {
  serverName: string;
  joints: JointConfig[];
}

export interface PosePolicyConfig {
  serviceName: string;
  serviceType: string;
  poses: string[];
}

export interface RobotProfile {
  id: string;
  name: string;
  cmdVelTopic: string;
  navGoalTopic: string;
  ttsTopic?: string;
  batteryTopic?: string;
  arm?: ArmConfig;
  gripper?: GripperConfig;
  head?: HeadConfig;
  posePolicy?: PosePolicyConfig;
}

export const ROBOT_PROFILES: RobotProfile[] = [
  {
    id: 'hsrb',
    name: 'HSR-B',
    cmdVelTopic: '/hsrb/command_velocity',
    navGoalTopic: '/goal',
    ttsTopic: '/talk_request',
    batteryTopic: '/hsrb/battery_state',
    arm: {
      serverName: '/hsrb/arm_trajectory_controller/follow_joint_trajectory',
      joints: [
        { key: 'arm_lift',   jointName: 'arm_lift_joint',   label: 'arm_lift',   min: 0.00,  max: 0.69, step: 0.01, unit: 'm',   defaultValue: 0.0 },
        { key: 'arm_flex',   jointName: 'arm_flex_joint',   label: 'arm_flex',   min: -2.62, max: 0.00, step: 0.01, unit: 'rad', defaultValue: 0.0 },
        { key: 'arm_roll',   jointName: 'arm_roll_joint',   label: 'arm_roll',   min: -2.09, max: 3.84, step: 0.01, unit: 'rad', defaultValue: 0.0 },
        { key: 'wrist_flex', jointName: 'wrist_flex_joint', label: 'wrist_flex', min: -1.92, max: 1.22, step: 0.01, unit: 'rad', defaultValue: -1.57 },
        { key: 'wrist_roll', jointName: 'wrist_roll_joint', label: 'wrist_roll', min: -1.92, max: 3.84, step: 0.01, unit: 'rad', defaultValue: 0.0 },
      ],
      presets: {
        go:      { arm_lift: 0.0, arm_flex: 0.0, arm_roll: -1.57, wrist_flex: -1.57, wrist_roll: 0.0 },
        neutral: { arm_lift: 0.0, arm_flex: 0.0, arm_roll: 0.0,   wrist_flex: -1.57, wrist_roll: 0.0 },
      },
    },
    gripper: {
      serverName: '/hsrb/gripper_controller/follow_joint_trajectory',
      jointName: 'hand_motor_joint',
      min: 0.0,
      max: 1.23,
      defaultValue: 0.5,
    },
    head: {
      serverName: '/hsrb/head_trajectory_controller/follow_joint_trajectory',
      joints: [
        { key: 'pan',  jointName: 'head_pan_joint',  label: 'pan',  min: -3.84, max: 1.75, step: 0.01, unit: 'rad', defaultValue: 0.0 },
        { key: 'tilt', jointName: 'head_tilt_joint', label: 'tilt', min: -0.61, max: 0.35, step: 0.01, unit: 'rad', defaultValue: 0.0 },
      ],
    },
  },
  {
    id: 'g1',
    name: 'G1',
    cmdVelTopic: '/cmd_vel',
    navGoalTopic: '/goal_pose',
    ttsTopic: '/talk_request',
    batteryTopic: '/hsrb/battery_state',
    posePolicy: {
      serviceName: '/pose_policy',
      serviceType: 'g1_srvs/srv/PosePolicy',
      poses: ['squat', 'stand', 'walk', 'start', 'running', 'damp', 'zero_torque'],
    },
  },
  {
    id: 'generic',
    name: 'Generic (cmd_vel only)',
    cmdVelTopic: '/cmd_vel',
    navGoalTopic: '/goal',
  },
];

export const DEFAULT_PROFILE_ID = 'hsrb';

export function findProfile(id: string): RobotProfile {
  return ROBOT_PROFILES.find(p => p.id === id) ?? ROBOT_PROFILES[0];
}

export interface TopicOverrides {
  cmdVelTopic?: string;
  navGoalTopic?: string;
  ttsTopic?: string;
  batteryTopic?: string;
  armServerName?: string;
  gripperServerName?: string;
  headServerName?: string;
}

export function applyOverrides(base: RobotProfile, overrides: TopicOverrides): RobotProfile {
  const p: RobotProfile = { ...base };
  if (overrides.cmdVelTopic)   p.cmdVelTopic = overrides.cmdVelTopic;
  if (overrides.navGoalTopic)  p.navGoalTopic = overrides.navGoalTopic;
  if ('ttsTopic' in overrides)     p.ttsTopic = overrides.ttsTopic || undefined;
  if ('batteryTopic' in overrides) p.batteryTopic = overrides.batteryTopic || undefined;
  if (overrides.armServerName && base.arm)
    p.arm = { ...base.arm, serverName: overrides.armServerName };
  if (overrides.gripperServerName && base.gripper)
    p.gripper = { ...base.gripper, serverName: overrides.gripperServerName };
  if (overrides.headServerName && base.head)
    p.head = { ...base.head, serverName: overrides.headServerName };
  return p;
}
