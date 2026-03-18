import { useEffect, useRef, useState } from 'react';
import { Typography, Box } from '@mui/material';
import AppLayout from '~/components/AppLayout';
import ROSLIB from 'roslib';
import { useRos } from '~/scripts/ros';

interface MapInfo {
  width: number;
  height: number;
  resolution: number;
  originX: number;
  originY: number;
}

export default function MapView() {
  const { ros } = useRos();
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  const robotCanvasRef = useRef<HTMLCanvasElement>(null);
  const mapInfoRef = useRef<MapInfo | null>(null);
  const [hasMap, setHasMap] = useState(false);
  const [status, setStatus] = useState('Waiting for /map...');

  useEffect(() => {
    if (!ros) return;

    const mapSub = new ROSLIB.Topic({ ros, name: '/map', messageType: 'nav_msgs/OccupancyGrid' });
    mapSub.subscribe((message: any) => {
      const { width, height, resolution } = message.info;
      const originX: number = message.info.origin.position.x;
      const originY: number = message.info.origin.position.y;
      mapInfoRef.current = { width, height, resolution, originX, originY };
      setStatus(`${width}×${height} cells, ${resolution}m/cell`);
      setHasMap(true);

      const canvas = mapCanvasRef.current;
      if (!canvas) return;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imgData = ctx.createImageData(width, height);
      const data: number[] = message.data;
      for (let i = 0; i < data.length; i++) {
        const val = data[i];
        let r: number, g: number, b: number;
        if (val === -1) {
          r = 180; g = 180; b = 180; // unknown
        } else if (val === 0) {
          r = 255; g = 255; b = 255; // free
        } else {
          const intensity = Math.round((1 - val / 100) * 200);
          r = intensity; g = intensity; b = intensity; // occupied
        }
        imgData.data[i * 4]     = r;
        imgData.data[i * 4 + 1] = g;
        imgData.data[i * 4 + 2] = b;
        imgData.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    });

    const poseSub = new ROSLIB.Topic({ ros, name: '/hsrb/pose2D', messageType: 'geometry_msgs/Pose2D' });
    poseSub.subscribe((message: any) => {
      const info = mapInfoRef.current;
      if (!info) return;
      const canvas = robotCanvasRef.current;
      if (!canvas) return;
      canvas.width = info.width;
      canvas.height = info.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // World → canvas coordinates (flip Y axis)
      const cx = (message.x - info.originX) / info.resolution;
      const cy = info.height - (message.y - info.originY) / info.resolution;
      const theta: number = message.theta;

      const r = Math.max(4, Math.round(0.25 / info.resolution));
      const arrowLen = Math.max(8, Math.round(0.5 / info.resolution));

      // Robot circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(220, 50, 50, 0.85)';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = Math.max(1, r * 0.3);
      ctx.stroke();

      // Direction arrow
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + arrowLen * Math.cos(theta), cy - arrowLen * Math.sin(theta));
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = Math.max(1, r * 0.4);
      ctx.stroke();
    });

    return () => {
      mapSub.unsubscribe();
      poseSub.unsubscribe();
    };
  }, [ros]);

  return (
    <AppLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1565C0' }}>Map View</Typography>
          <Typography variant="caption" color="text.secondary">{status}</Typography>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, bgcolor: '#f5f5f5' }}>
          {hasMap ? (
            <Box sx={{ position: 'relative', display: 'inline-block', boxShadow: 3 }}>
              <canvas
                ref={mapCanvasRef}
                style={{ display: 'block', imageRendering: 'pixelated', maxWidth: '100%', maxHeight: 'calc(100vh - 140px)' }}
              />
              <canvas
                ref={robotCanvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  imageRendering: 'pixelated',
                }}
              />
            </Box>
          ) : (
            <Typography color="text.secondary">Waiting for /map topic...</Typography>
          )}
        </Box>
      </Box>
    </AppLayout>
  );
}
