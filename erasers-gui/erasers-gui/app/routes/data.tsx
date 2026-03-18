import { useEffect, useRef, useState } from 'react';
import { Typography, Card, CardContent, Box, Button, Fab, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Autocomplete } from '@mui/material';
import AppLayout from '~/components/AppLayout';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import TopicIcon from '@mui/icons-material/Topic';

import ROSLIB from 'roslib';
import { useRos } from '~/scripts/ros';

type CustomTopic = {
  id: string;
  label: string;
  topic: string;
  messageType: string;
};


const CUSTOM_TOPICS_KEY = 'data_viewer_custom_topics';

function renderValue(value: unknown, depth = 0): React.ReactNode {
  if (value === null || value === undefined) {
    return <span style={{ color: 'gray' }}>—</span>;
  }
  if (typeof value === 'boolean') {
    return <span style={{ color: value ? '#2e7d32' : '#c62828' }}>{String(value)}</span>;
  }
  if (typeof value === 'number') {
    return <span style={{ float: 'right' }}>{value.toFixed(4)}</span>;
  }
  if (typeof value === 'string') {
    return <span>{value}</span>;
  }
  if (Array.isArray(value)) {
    const allNumbers = value.every(v => typeof v === 'number');
    if (allNumbers) {
      const nums = value as number[];
      if (nums.length <= 20) {
        return <span>{nums.map(n => n.toFixed(4)).join(', ')}</span>;
      }
      return <span>{nums.slice(0, 5).map(n => n.toFixed(4)).join(', ')} …{nums.length} items</span>;
    }
    return <span>{JSON.stringify(value)}</span>;
  }
  if (typeof value === 'object') {
    return renderObject(value as Record<string, unknown>, depth);
  }
  return <span>{String(value)}</span>;
}

function renderObject(obj: Record<string, unknown>, depth = 0): React.ReactNode {
  if (depth >= 3) {
    return <span>{JSON.stringify(obj)}</span>;
  }
  return (
    <>
      {Object.entries(obj)
        .filter(([key]) => key !== 'header')
        .map(([key, val]) => {
          if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
            return (
              <Box key={key} sx={{ mt: depth === 0 ? 0.5 : 0.25 }}>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.05em', mt: 0.5 }}>
                  {key.toUpperCase()}
                </Typography>
                <Box sx={{ pl: (depth + 1) * 1.5 }}>
                  {renderObject(val as Record<string, unknown>, depth + 1)}
                </Box>
              </Box>
            );
          }
          return (
            <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25, gap: 1 }}>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'text.secondary', flexShrink: 0 }}>{key}</Typography>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', textAlign: 'right' }}>
                {renderValue(val, depth + 1)}
              </Typography>
            </Box>
          );
        })}
    </>
  );
}

function renderMessage(_ct: CustomTopic, message: any): React.ReactNode {
  return (
    <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
      {renderObject(message)}
    </Box>
  );
}

export default function DataViewer() {
  const [topics, setTopics] = useState<CustomTopic[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_TOPICS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [topicData, setTopicData] = useState<Record<string, React.ReactNode>>({});
  const [topicStopped, setTopicStopped] = useState<Record<string, boolean>>({});
  const topicStoppedRef = useRef<Record<string, boolean>>({});

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newMsgType, setNewMsgType] = useState('');
  const [rosTopics, setRosTopics] = useState<{ topic: string; type: string }[]>([]);

  const { ros } = useRos();

  // Keep ref in sync so subscribe callbacks always see current stopped state
  useEffect(() => {
    topicStoppedRef.current = topicStopped;
  }, [topicStopped]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_TOPICS_KEY, JSON.stringify(topics));
  }, [topics]);

  useEffect(() => {
    if (!ros) return;

    const subs = topics.map(ct => {
      const sub = new ROSLIB.Topic({ ros, name: ct.topic, messageType: ct.messageType });
      sub.subscribe((message: any) => {
        if (topicStoppedRef.current[ct.id]) return;
        setTopicData(prev => ({ ...prev, [ct.id]: renderMessage(ct, message) }));
      });
      return sub;
    });

    return () => subs.forEach(s => s.unsubscribe());
  }, [ros, topics]);

  const handleAddTopic = () => {
    if (!newTopicName.trim() || !newMsgType.trim()) return;
    const newEntry: CustomTopic = {
      id: `custom_${Date.now()}`,
      label: newLabel.trim() || newTopicName.trim(),
      topic: newTopicName.trim(),
      messageType: newMsgType.trim(),
    };
    setTopics(prev => [...prev, newEntry]);
    setNewLabel('');
    setNewTopicName('');
    setNewMsgType('');
    setAddDialogOpen(false);
  };

  const handleDeleteTopic = (id: string) => {
    setTopics(prev => prev.filter(ct => ct.id !== id));
    setTopicData(prev => { const n = { ...prev }; delete n[id]; return n; });
    setTopicStopped(prev => { const n = { ...prev }; delete n[id]; return n; });
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
            {topics.map(ct => {
              const isStopped = !!topicStopped[ct.id];
              const icon = <TopicIcon />;
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
                    <Box sx={{ color: '#1565C0' }}>{icon}</Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{ct.label}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{ct.topic}</Typography>
                    </Box>
                    <Button
                      size="small"
                      variant={isStopped ? 'contained' : 'outlined'}
                      color={isStopped ? 'success' : 'error'}
                      onClick={() => setTopicStopped(prev => ({ ...prev, [ct.id]: !prev[ct.id] }))}
                      sx={{ minWidth: 64 }}
                    >
                      {isStopped ? 'RUN' : 'STOP'}
                    </Button>
                    <IconButton size="small" color="error" onClick={() => handleDeleteTopic(ct.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <CardContent sx={{ flex: 1, overflow: 'auto' }}>
                    {topicData[ct.id] ?? (
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
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        TransitionProps={{
          onEnter: () => {
            if (!ros) return;
            ros.getTopics(
              (result: { topics: string[]; types: string[] }) => {
                const opts = result.topics
                  .map((t, i) => ({ topic: t, type: result.types[i] }))
                  .sort((a, b) => a.topic.localeCompare(b.topic));
                setRosTopics(opts);
              },
              () => setRosTopics([]),
            );
          },
        }}
      >
        <DialogTitle>Add Topic</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Autocomplete
            options={rosTopics}
            getOptionLabel={opt => opt.topic}
            noOptionsText={ros ? 'トピックが見つかりません' : 'ROS未接続'}
            onChange={(_, selected) => {
              if (selected) {
                setNewTopicName(selected.topic);
                setNewMsgType(selected.type);
              }
            }}
            renderOption={(props, opt) => (
              <Box component="li" {...props} key={opt.topic}>
                <Box>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{opt.topic}</Typography>
                  <Typography variant="caption" color="text.secondary">{opt.type}</Typography>
                </Box>
              </Box>
            )}
            renderInput={params => <TextField {...params} label="トピックを選択" size="small" />}
            size="small"
            fullWidth
          />
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
