import { useEffect, useRef } from 'react';

interface VirtualJoystickProps {
    /** Called on joystick move with normalized x (-1=left, +1=right) and y (-1=down, +1=up) */
    onMove: (x: number, y: number) => void;
    onStop: () => void;
    label?: string;
    color?: string;
}

const MAX_RADIUS = 40;
const BASE_SIZE  = 120;
const STICK_SIZE = 56;

export default function VirtualJoystick({ onMove, onStop, label, color = 'red' }: VirtualJoystickProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const baseRef      = useRef<HTMLDivElement>(null);
    const stickRef     = useRef<HTMLDivElement>(null);

    // Keep callbacks in refs to avoid stale closures in pointer handlers
    const onMoveRef = useRef(onMove);
    const onStopRef = useRef(onStop);
    useEffect(() => { onMoveRef.current = onMove; }, [onMove]);
    useEffect(() => { onStopRef.current = onStop; }, [onStop]);

    // Track active pointer and origin
    const activePointer = useRef<number | null>(null);
    const origin = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const container = containerRef.current;
        const base  = baseRef.current;
        const stick = stickRef.current;
        if (!container || !base || !stick) return;

        // Apply color to stick
        stick.style.backgroundColor = color;
        base.style.borderColor = color;

        const onPointerDown = (e: PointerEvent) => {
            // Only one pointer at a time per joystick
            if (activePointer.current !== null) return;
            activePointer.current = e.pointerId;
            container.setPointerCapture(e.pointerId);

            const rect = container.getBoundingClientRect();
            const ox = e.clientX - rect.left;
            const oy = e.clientY - rect.top;
            origin.current = { x: ox, y: oy };

            base.style.display  = 'block';
            stick.style.display = 'block';
            base.style.left  = `${ox - BASE_SIZE / 2}px`;
            base.style.top   = `${oy - BASE_SIZE / 2}px`;
            stick.style.left = `${ox - STICK_SIZE / 2}px`;
            stick.style.top  = `${oy - STICK_SIZE / 2}px`;
        };

        const onPointerMove = (e: PointerEvent) => {
            if (e.pointerId !== activePointer.current) return;

            const rect = container.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;

            const dx = cx - origin.current.x;
            const dy = cy - origin.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const clamped = Math.min(dist, MAX_RADIUS);
            const angle = Math.atan2(dy, dx);

            const sx = Math.cos(angle) * clamped;
            const sy = Math.sin(angle) * clamped;

            stick.style.left = `${origin.current.x + sx - STICK_SIZE / 2}px`;
            stick.style.top  = `${origin.current.y + sy - STICK_SIZE / 2}px`;

            const nx =  sx / MAX_RADIUS;  // right: +1
            const ny = -sy / MAX_RADIUS;  // up:    +1
            onMoveRef.current(nx, ny);
        };

        const onPointerUp = (e: PointerEvent) => {
            if (e.pointerId !== activePointer.current) return;
            activePointer.current = null;
            base.style.display  = 'none';
            stick.style.display = 'none';
            onStopRef.current();
        };

        container.addEventListener('pointerdown',   onPointerDown);
        container.addEventListener('pointermove',   onPointerMove);
        container.addEventListener('pointerup',     onPointerUp);
        container.addEventListener('pointercancel', onPointerUp);

        return () => {
            container.removeEventListener('pointerdown',   onPointerDown);
            container.removeEventListener('pointermove',   onPointerMove);
            container.removeEventListener('pointerup',     onPointerUp);
            container.removeEventListener('pointercancel', onPointerUp);
        };
    }, [color]);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                inset: 0,
                touchAction: 'none',
                userSelect: 'none',
                backgroundColor: '#f5f7fa',
                borderRadius: 20,
                border: '2px dashed #ccc',
                overflow: 'hidden',
            }}
        >
            {label && (
                <span style={{
                    position: 'absolute',
                    top: 8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontWeight: 'bold',
                    fontSize: 14,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                }}>
                    {label}
                </span>
            )}

            {/* Base circle */}
            <div
                ref={baseRef}
                style={{
                    display: 'none',
                    position: 'absolute',
                    width:  BASE_SIZE,
                    height: BASE_SIZE,
                    borderRadius: '50%',
                    border: `3px solid ${color}`,
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    pointerEvents: 'none',
                    boxSizing: 'border-box',
                }}
            />

            {/* Stick circle */}
            <div
                ref={stickRef}
                style={{
                    display: 'none',
                    position: 'absolute',
                    width:  STICK_SIZE,
                    height: STICK_SIZE,
                    borderRadius: '50%',
                    backgroundColor: color,
                    opacity: 0.85,
                    pointerEvents: 'none',
                    boxSizing: 'border-box',
                }}
            />
        </div>
    );
}
