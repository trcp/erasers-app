import { useEffect, useRef, useState } from 'react';
import { Chip } from '@mui/material';
import ROSLIB from 'roslib';

interface GamepadControllerProps {
    cmdVel: ROSLIB.Topic;
    linearScale: number;
    lateralScale: number;
    angularScale: number;
}

type GamepadStatus = 'disconnected' | 'connected' | 'active';

const DEADZONE = 0.1;
const PUBLISH_INTERVAL_MS = 50; // ~20Hz

export default function GamepadController({ cmdVel, linearScale, lateralScale, angularScale }: GamepadControllerProps) {
    const [status, setStatus] = useState<GamepadStatus>('disconnected');
    const rafRef = useRef<number | null>(null);
    const lastPublishRef = useRef<number>(0);
    const statusRef = useRef<GamepadStatus>('disconnected');

    useEffect(() => {
        const handleConnected = (e: GamepadEvent) => {
            console.log('Gamepad connected:', e.gamepad.id);
            statusRef.current = 'connected';
            setStatus('connected');
        };

        const handleDisconnected = (e: GamepadEvent) => {
            console.log('Gamepad disconnected:', e.gamepad.id);
            statusRef.current = 'disconnected';
            setStatus('disconnected');
        };

        window.addEventListener('gamepadconnected', handleConnected);
        window.addEventListener('gamepaddisconnected', handleDisconnected);

        const loop = (timestamp: number) => {
            const gamepads = navigator.getGamepads();
            let activeGamepad: Gamepad | null = null;

            for (const gp of gamepads) {
                if (gp) { activeGamepad = gp; break; }
            }

            if (activeGamepad && timestamp - lastPublishRef.current >= PUBLISH_INTERVAL_MS) {
                lastPublishRef.current = timestamp;

                const axes = activeGamepad.axes;
                const applyDeadzone = (v: number) => Math.abs(v) < DEADZONE ? 0 : v;

                // Omni-wheel axis mapping (Gamepad Standard Layout)
                // Left stick X  → lateral (linear.y)   axes[0]: right = +1
                // Left stick Y  → forward  (linear.x)  axes[1]: down  = +1  → invert
                // Right stick X → rotation (angular.z)  axes[2]: right = +1  → invert (CW = negative)
                const linear_x  = applyDeadzone(-(axes[1] ?? 0)) * linearScale;
                const linear_y  = applyDeadzone(-(axes[0] ?? 0)) * lateralScale;
                const angular_z = applyDeadzone(-(axes[2] ?? 0)) * angularScale;

                const isActive = linear_x !== 0 || linear_y !== 0 || angular_z !== 0;
                if (isActive && statusRef.current !== 'active') {
                    statusRef.current = 'active';
                    setStatus('active');
                } else if (!isActive && statusRef.current === 'active') {
                    statusRef.current = 'connected';
                    setStatus('connected');
                }

                const twist = new ROSLIB.Message({
                    linear:  { x: linear_x,  y: linear_y, z: 0.0 },
                    angular: { x: 0.0, y: 0.0, z: angular_z }
                });
                cmdVel.publish(twist);
            }

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener('gamepadconnected', handleConnected);
            window.removeEventListener('gamepaddisconnected', handleDisconnected);
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, [cmdVel, linearScale, lateralScale, angularScale]);

    const chipColor = status === 'active' ? 'success' : status === 'connected' ? 'primary' : 'default';
    const chipLabel = status === 'active' ? 'Gamepad Active' : status === 'connected' ? 'Gamepad Connected' : 'Gamepad Disconnected';

    return (
        <Chip
            label={chipLabel}
            color={chipColor}
            variant="outlined"
            sx={{ fontSize: '1rem', height: 40 }}
        />
    );
}
