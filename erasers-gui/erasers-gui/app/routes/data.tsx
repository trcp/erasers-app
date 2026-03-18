import { useEffect, useState } from 'react';
import { Typography, Card, CardContent, Box, Button, Fab, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from '@mui/material';
import AppLayout from '~/components/AppLayout';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import TopicIcon from '@mui/icons-material/Topic';

import ROSLIB from 'roslib';
import { useRos } from '~/scripts/ros';

const topicMeta = {
  batteryState: { label: 'Battery State', topic: '/hsrb/battery_state', icon: <BatteryChargingFullIcon /> },
  jointState: { label: 'Joint States', topic: '/hsrb/joint_states', icon: <DeviceHubIcon /> },
  pose2D: { label: 'Pose 2D', topic: '/hsrb/pose2D', icon: <MyLocationIcon /> },
  wristWrench: { label: 'Wrist Wrench', topic: '/hsrb/wrist_wrench/raw', icon: <FitnessCenterIcon /> },
};

type CustomTopic = {
  id: string;
  label: string;
  topic: string;
  messageType: string;
};

const CUSTOM_TOPICS_KEY = 'data_viewer_custom_topics';

export default function DataViewer() {

  const msg = { "batteryState": null, "jointState": null, "pose2D": null, "wristWrench": null };
  const buttonState = { "batteryState": false, "jointState": false, "pose2D": false, "wristWrench": false };
  const [jointState, setJointState] = useState(msg);
  const [stopData, setStopData] = useState(buttonState);

  const [customTopics, setCustomTopics] = useState<CustomTopic[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CUSTOM_TOPICS_KEY) || '[]');
    } catch { return []; }
  });
  const [customData, setCustomData] = useState<Record<string, React.ReactNode>>({});
  const [customStopped, setCustomStopped] = useState<Record<string, boolean>>({});

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newMsgType, setNewMsgType] = useState('');

  const { ros } = useRos();

  useEffect(() => {
    localStorage.setItem(CUSTOM_TOPICS_KEY, JSON.stringify(customTopics));
  }, [customTopics]);

  useEffect(() => {
    if (!ros) return;

    const batteryStateSub = new ROSLIB.Topic({ ros, name: '/hsrb/battery_state', messageType: 'tmc_msgs/BatteryState' });
    batteryStateSub.subscribe(message => {
      if (stopData["batteryState"] != true) {
        var element = (
          <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
            <div>{JSON.stringify(message, null, 2)}</div>
          </Box>
        );
        jointState["batteryState"] = element;
        setJointState({ ...jointState });
      }
    });

    const jointStatesSub = new ROSLIB.Topic({ ros, name: '/hsrb/joint_states', messageType: 'sensor_msgs/JointState' });
    jointStatesSub.subscribe(message => {
      const name = message.name;
      const position = message.position;
      const velocity = message.velocity;
      const effort = message.effort;
      if (stopData["jointState"] != true) {
        var element = (
          <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
            {name.map((_, index) => (
              <Box key={index} sx={{ mb: 0.5 }}>
                <Typography component="span" sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {name[index]}:
                </Typography>{' '}
                {Math.round(position[index] * 1000) / 1000}, {Math.round(velocity[index] * 1000) / 1000}, {Math.round(effort[index] * 1000) / 1000}
              </Box>
            ))}
          </Box>
        );
        jointState["jointState"] = element;
        setJointState({ ...jointState });
      }
    });

    const pose2DSub = new ROSLIB.Topic({ ros, name: '/hsrb/pose2D', messageType: 'geometry_msgs/Pose2D' });
    pose2DSub.subscribe(message => {
      if (stopData["pose2D"] != true) {
        var element = (
          <Box sx={{ fontFamily: 'monospace' }}>
            {[['X', message.x], ['Y', message.y], ['θ', message.theta]].map(([label, val]) => (
              <Box key={String(label)} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'text.secondary' }}>{label}</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 600 }}>{Number(val).toFixed(4)}</Typography>
              </Box>
            ))}
          </Box>
        );
        jointState["pose2D"] = element;
        setJointState({ ...jointState });
      }
    });

    const wristWrenchSub = new ROSLIB.Topic({ ros, name: '/hsrb/wrist_wrench/raw', messageType: 'geometry_msgs/WrenchStamped' });
    wristWrenchSub.subscribe(message => {
      const data = message.wrench;
      if (stopData["wristWrench"] != true) {
        var element = (
          <Box sx={{ fontFamily: 'monospace' }}>
            <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.8rem', color: 'text.secondary' }}>FORCE</Typography>
            {['x', 'y', 'z'].map(axis => (
              <Box key={`f${axis}`} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'text.secondary' }}>{axis.toUpperCase()}</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 600 }}>{Number(data.force[axis]).toFixed(4)}</Typography>
              </Box>
            ))}
            <Typography sx={{ fontWeight: 600, mt: 1, mb: 0.5, fontSize: '0.8rem', color: 'text.secondary' }}>TORQUE</Typography>
            {['x', 'y', 'z'].map(axis => (
              <Box key={`t${axis}`} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'text.secondary' }}>{axis.toUpperCase()}</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 600 }}>{Number(data.torque[axis]).toFixed(4)}</Typography>
              </Box>
            ))}
          </Box>
        );
        jointState["wristWrench"] = element;
        setJointState({ ...jointState });
      }
    });

    return () => {
      batteryStateSub.unsubscribe();
      jointStatesSub.unsubscribe();
      pose2DSub.unsubscribe();
      wristWrenchSub.unsubscribe();
    };
  }, [ros]);

  useEffect(() => {
    if (!ros || customTopics.length === 0) return;

    const subs = customTopics.map(ct => {
      const sub = new ROSLIB.Topic({ ros, name: ct.topic, messageType: ct.messageType });
      sub.subscribe((message: any) => {
        if (customStopped[ct.id]) return;
        setCustomData(prev => ({
          ...prev,
          [ct.id]: (
            <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(message, null, 2)}</pre>
            </Box>
          ),
        }));
      });
      return sub;
    });

    return () => subs.forEach(s => s.unsubscribe());
  }, [ros, customTopics]);

  const stopDataFunc = (b, k) => {
    stopData[k] = b;
    setStopData({ ...stopData });
  };

  const handleAddTopic = () => {
    if (!newTopicName.trim() || !newMsgType.trim()) return;
    const newEntry: CustomTopic = {
      id: `custom_${Date.now()}`,
      label: newLabel.trim() || newTopicName.trim(),
      topic: newTopicName.trim(),
      messageType: newMsgType.trim(),
    };
    setCustomTopics(prev => [...prev, newEntry]);
    setNewLabel('');
    setNewTopicName('');
    setNewMsgType('');
    setAddDialogOpen(false);
  };

  const handleDeleteTopic = (id: string) => {
    setCustomTopics(prev => prev.filter(ct => ct.id !== id));
    setCustomData(prev => { const n = { ...prev }; delete n[id]; return n; });
    setCustomStopped(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const toggleCustomStopped = (id: string) => {
    setCustomStopped(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <AppLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1565C0' }}>Data Viewer</Typography>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 1,
          }}>
            {Object.keys(jointState).map((key, index) => {
              const meta = topicMeta[key];
              const isStopped = stopData[key];
              return (
                  <Card key={index} elevation={2} sx={{ height: 360, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      px: 2,
                      py: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      gap: 1,
                    }}>
                      <Box sx={{ color: '#1565C0' }}>{meta.icon}</Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{meta.label}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{meta.topic}</Typography>
                      </Box>
                      <Button
                        size="small"
                        variant={isStopped ? 'contained' : 'outlined'}
                        color={isStopped ? 'success' : 'error'}
                        onClick={() => stopDataFunc(!isStopped, key)}
                        sx={{ minWidth: 64 }}
                      >
                        {isStopped ? 'RUN' : 'STOP'}
                      </Button>
                    </Box>
                    <CardContent sx={{ flex: 1, overflow: 'auto' }}>
                      {jointState[key] ? jointState[key] : (
                        <Typography variant="body2" color="text.secondary">Waiting for data...</Typography>
                      )}
                    </CardContent>
                  </Card>
              );
            })}

            {/* Custom topic cards */}
            {customTopics.map(ct => {
              const isStopped = !!customStopped[ct.id];
              return (
                <Card key={ct.id} elevation={2} sx={{ height: 360, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    gap: 1,
                  }}>
                    <Box sx={{ color: '#1565C0' }}><TopicIcon /></Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{ct.label}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{ct.topic}</Typography>
                    </Box>
                    <Button
                      size="small"
                      variant={isStopped ? 'contained' : 'outlined'}
                      color={isStopped ? 'success' : 'error'}
                      onClick={() => toggleCustomStopped(ct.id)}
                      sx={{ minWidth: 64 }}
                    >
                      {isStopped ? 'RUN' : 'STOP'}
                    </Button>
                    <IconButton size="small" color="error" onClick={() => handleDeleteTopic(ct.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <CardContent sx={{ flex: 1, overflow: 'auto' }}>
                    {customData[ct.id] ? customData[ct.id] : (
                      <Typography variant="body2" color="text.secondary">Waiting for data...</Typography>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* FAB to add custom topic */}
      <Fab
        color="primary"
        onClick={() => setAddDialogOpen(true)}
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
      >
        <AddIcon />
      </Fab>

      {/* Add Topic Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Custom Topic</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Label (optional)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label="Topic Name"
            value={newTopicName}
            onChange={e => setNewTopicName(e.target.value)}
            size="small"
            fullWidth
            placeholder="/some/topic"
          />
          <TextField
            label="Message Type"
            value={newMsgType}
            onChange={e => setNewMsgType(e.target.value)}
            size="small"
            fullWidth
            placeholder="std_msgs/String"
            onKeyDown={e => { if (e.key === 'Enter') handleAddTopic(); }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddTopic} disabled={!newTopicName.trim() || !newMsgType.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}
