import {
    Box,
    Modal,
    Button,
    Checkbox,
    FormControlLabel,
    Typography,
    Chip,
    Divider,
    IconButton,
    Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArticleIcon from "@mui/icons-material/Article";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { useEffect, useRef, useState } from "react";

function getLineColor(line: string): string {
    if (/error/i.test(line)) return '#FF5555';
    if (/warn/i.test(line))  return '#FFB86C';
    return '#50FA7B';
}

const modalBoxStyle = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '85%',
    maxWidth: 1100,
    height: '80%',
    bgcolor: '#1e1e1e',
    border: '1px solid #444',
    borderRadius: 2,
    boxShadow: 24,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
};

export default function LogModal({ openModal, serverIp = 'localhost' }) {

    const [log, setLog]               = useState<string[]>([]);
    const [connection, setConnection] = useState<WebSocket | null>(null);
    const [isOpen, setIsOpen]         = useState(false);
    const [scroll, setScroll]         = useState(true);
    const [wsStatus, setWsStatus]     = useState<'connected' | 'closed'>('closed');

    const scrollBottomRef = useRef<HTMLDivElement | null>(null);

    const connectWebSocket = (taskName: string, nodeName: string): WebSocket => {
        console.log(`LOG button clicked for ${nodeName}`);
        const conn = new WebSocket(`ws://${serverIp}:3001/ws/${taskName}/${nodeName}`);

        conn.onopen = () => {
            console.log('get connected');
            setWsStatus('connected');
        };

        conn.onerror = (error) => {
            console.log("error occured", error);
        };

        conn.onmessage = (event) => {
            const stripped = event.data.replace(/\x1b\[[0-9;]*m/g, '');
            setLog((prevLog) => [...prevLog, stripped]);
        };

        conn.onclose = () => {
            console.log("connection CLOSED");
            setWsStatus('closed');
        };

        return conn;
    };

    const closeLogModal = () => {
        connection?.close(1000);
        setLog([]);
        setWsStatus('closed');
        setIsOpen(false);
    };

    useEffect(() => {
        if (openModal.length == 2) {
            const conn = connectWebSocket(openModal[0], openModal[1]);
            setConnection(conn);
            setIsOpen(true);
        }
        return () => { };
    }, [openModal]);

    useEffect(() => {
        if (scroll) {
            scrollBottomRef?.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [log]);

    const taskName = openModal[0] ?? '';
    const nodeName = openModal[1] ?? '';

    return (
        <Modal
            open={isOpen}
            onClose={closeLogModal}
            aria-labelledby="log-modal-title"
        >
            <Box sx={modalBoxStyle}>

                {/* Header */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2,
                    py: 1.25,
                    bgcolor: '#252526',
                    borderBottom: '1px solid #3a3a3a',
                    flexShrink: 0,
                }}>
                    <ArticleIcon sx={{ color: '#858585', fontSize: 18 }} />
                    <Typography
                        id="log-modal-title"
                        variant="subtitle2"
                        sx={{ color: '#cccccc', fontFamily: 'monospace', fontWeight: 600 }}
                    >
                        {taskName}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: '#858585', fontFamily: 'monospace' }}>
                        /
                    </Typography>
                    <Typography
                        variant="subtitle2"
                        sx={{ color: '#9cdcfe', fontFamily: 'monospace', fontWeight: 600 }}
                    >
                        {nodeName}
                    </Typography>

                    <Box sx={{ flex: 1 }} />

                    <Chip
                        size="small"
                        icon={
                            <Box
                                component="span"
                                sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    bgcolor: wsStatus === 'connected' ? '#50FA7B' : '#6c6c6c',
                                    ml: '6px !important',
                                    flexShrink: 0,
                                }}
                            />
                        }
                        label={wsStatus === 'connected' ? 'Connected' : 'Closed'}
                        sx={{
                            bgcolor: wsStatus === 'connected' ? 'rgba(80,250,123,0.12)' : 'rgba(108,108,108,0.15)',
                            color: wsStatus === 'connected' ? '#50FA7B' : '#6c6c6c',
                            border: '1px solid',
                            borderColor: wsStatus === 'connected' ? 'rgba(80,250,123,0.35)' : 'rgba(108,108,108,0.35)',
                            fontFamily: 'monospace',
                            fontSize: '0.72rem',
                            height: 24,
                        }}
                    />

                    <Chip
                        size="small"
                        label={`${log.length} lines`}
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.06)',
                            color: '#858585',
                            fontFamily: 'monospace',
                            fontSize: '0.72rem',
                            height: 24,
                        }}
                    />
                </Box>

                {/* Log area */}
                <Box sx={{
                    flex: 1,
                    overflowY: 'auto',
                    bgcolor: '#1e1e1e',
                    px: 2,
                    py: 1,
                    '&::-webkit-scrollbar': { width: 8 },
                    '&::-webkit-scrollbar-track': { bgcolor: '#1e1e1e' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: '#444', borderRadius: 4 },
                }}>
                    {log.length === 0 ? (
                        <Typography sx={{
                            color: '#555',
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            mt: 2,
                        }}>
                            Waiting for log output…
                        </Typography>
                    ) : (
                        log.map((item, index) => (
                            <Box
                                key={index}
                                sx={{
                                    display: 'flex',
                                    gap: 1.5,
                                    lineHeight: 1.55,
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                                    borderRadius: '3px',
                                    px: 0.5,
                                }}
                            >
                                <Typography
                                    component="span"
                                    sx={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.78rem',
                                        color: '#555',
                                        userSelect: 'none',
                                        minWidth: 36,
                                        textAlign: 'right',
                                        flexShrink: 0,
                                        pt: '1px',
                                    }}
                                >
                                    {index + 1}
                                </Typography>
                                <Typography
                                    component="span"
                                    sx={{
                                        fontFamily: '"Cascadia Code", "JetBrains Mono", "Fira Code", "Courier New", monospace',
                                        fontSize: '0.82rem',
                                        color: getLineColor(item),
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                        flex: 1,
                                    }}
                                >
                                    {item}
                                </Typography>
                            </Box>
                        ))
                    )}
                    <div ref={scrollBottomRef} />
                </Box>

                {/* Controls bar */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1,
                    bgcolor: '#252526',
                    borderTop: '1px solid #3a3a3a',
                    flexShrink: 0,
                    gap: 1,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FormControlLabel
                            label={
                                <Typography variant="caption" sx={{ color: '#858585', userSelect: 'none' }}>
                                    Auto-scroll
                                </Typography>
                            }
                            control={
                                <Checkbox
                                    size="small"
                                    checked={scroll}
                                    onChange={(e) => setScroll(e.target.checked)}
                                    sx={{
                                        color: '#555',
                                        '&.Mui-checked': { color: '#50FA7B' },
                                        p: '4px',
                                    }}
                                />
                            }
                            sx={{ m: 0 }}
                        />

                        <Divider orientation="vertical" flexItem sx={{ borderColor: '#3a3a3a', mx: 0.5 }} />

                        <Tooltip title="Clear log" placement="top">
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={() => setLog([])}
                                    disabled={log.length === 0}
                                    sx={{
                                        color: '#858585',
                                        '&:hover': { color: '#cccccc', bgcolor: 'rgba(255,255,255,0.08)' },
                                        '&.Mui-disabled': { color: '#444' },
                                    }}
                                >
                                    <DeleteSweepIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>

                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<CloseIcon />}
                        onClick={closeLogModal}
                        sx={{
                            color: '#cccccc',
                            borderColor: '#555',
                            textTransform: 'none',
                            fontFamily: 'monospace',
                            minHeight: 32,
                            minWidth: 'unset',
                            px: 1.5,
                            '&:hover': {
                                borderColor: '#888',
                                bgcolor: 'rgba(255,255,255,0.07)',
                            },
                        }}
                    >
                        Close
                    </Button>
                </Box>

            </Box>
        </Modal>
    );
}
