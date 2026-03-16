import { useEffect, useRef } from 'react';
import nipplejs from 'nipplejs';
import { Typography } from '@mui/material';

interface VirtualJoystickProps {
    /** Called on joystick move with normalized x (-1=left, +1=right) and y (-1=down, +1=up) */
    onMove: (x: number, y: number) => void;
    onStop: () => void;
    label?: string;
    color?: string;
}

export default function VirtualJoystick({ onMove, onStop, label, color = 'red' }: VirtualJoystickProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const manager = nipplejs.create({
            zone: containerRef.current,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color,
            size: 150,
        });

        manager.on('move', (_evt, data) => {
            if (!data.angle || !data.force) return;
            const angle = data.angle.radian;
            const force = Math.min(data.force / 50, 1.0); // normalize to 0~1

            // nipplejs: angle=0 → right, angle=π/2 → up
            const x = Math.cos(angle) * force;  // right: +1
            const y = Math.sin(angle) * force;  // up:    +1

            onMove(x, y);
        });

        manager.on('end', () => {
            onStop();
        });

        return () => {
            manager.destroy();
        };
    }, [onMove, onStop, color]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {label && (
                <Typography variant="subtitle1" fontWeight="bold">{label}</Typography>
            )}
            <div
                ref={containerRef}
                style={{
                    width: '300px',
                    height: '300px',
                    position: 'relative',
                    touchAction: 'none',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '50%',
                    border: '2px solid #ccc',
                }}
            />
        </div>
    );
}
