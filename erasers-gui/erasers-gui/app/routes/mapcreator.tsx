import ROSLIB from 'roslib';
import { useRos } from '~/scripts/ros';

import React, { useEffect, useRef, useState } from 'react';
import {
    Button,
    Typography,
    Input,
    Box,
    TextField,
    Divider,
    Paper,
    Chip,
    Tabs,
    Tab,
} from '@mui/material';

import Accordion from '@mui/material/Accordion';
import AccordionActions from '@mui/material/AccordionActions';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SaveIcon from '@mui/icons-material/Save';
import RouterIcon from '@mui/icons-material/Router';
import PlaceIcon from '@mui/icons-material/Place';

import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import LinkIcon from '@mui/icons-material/Link';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

import AppLayout from '~/components/AppLayout';
import { AddNewLocationModal, AddRoomModal, MapModal } from '~/components/mapcreator/modal';

async function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => { resolve(event.target.result); };
        reader.onerror = (error) => { reject(error); };
        reader.readAsText(file);
    });
}

function elementToObj(el: Element): any {
    const obj: any = {};
    if (el.attributes.length > 0) {
        obj['$'] = {};
        for (let i = 0; i < el.attributes.length; i++) {
            obj['$'][el.attributes[i].name] = el.attributes[i].value;
        }
    }
    const childEls = Array.from(el.children);
    if (childEls.length > 0) {
        const groups: Record<string, Element[]> = {};
        for (const child of childEls) {
            (groups[child.tagName] = groups[child.tagName] || []).push(child);
        }
        for (const [tag, els] of Object.entries(groups)) {
            obj[tag] = els.map(elementToObj);
        }
    } else {
        const text = el.textContent?.trim();
        if (text) obj['_'] = text;
    }
    return obj;
}

async function xmlToJson(xml) {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const err = doc.querySelector('parsererror');
    if (err) throw new Error(err.textContent ?? 'XML parse error');
    const root = doc.documentElement;
    return { [root.tagName]: elementToObj(root) };
}

function objToXml(tagName: string, obj: any, indent = ''): string {
    if (typeof obj === 'string' || typeof obj === 'number') {
        return `${indent}<${tagName}>${obj}</${tagName}>`;
    }
    const attrs = obj['$']
        ? ' ' + Object.entries(obj['$']).map(([k, v]) => `${k}="${v}"`).join(' ')
        : '';
    const children: string[] = [];
    for (const [key, val] of Object.entries(obj)) {
        if (key === '$' || key === '_') continue;
        if (Array.isArray(val)) {
            for (const item of val) children.push(objToXml(key, item, indent + '  '));
        } else {
            children.push(objToXml(key, val as any, indent + '  '));
        }
    }
    if (obj['_']) children.push(indent + '  ' + obj['_']);
    if (children.length === 0) return `${indent}<${tagName}${attrs}/>`;
    return `${indent}<${tagName}${attrs}>\n${children.join('\n')}\n${indent}</${tagName}>`;
}

async function jsonToXml(json_obj) {
    const [rootTag, rootVal] = Object.entries(json_obj)[0];
    return `<?xml version="1.0" encoding="UTF-8"?>\n${objToXml(rootTag as string, rootVal)}`;
}

const MAP_TOPIC_CANDIDATES = [
    '/map',
    '/move_base/global_costmap/costmap',
    '/move_base/local_costmap/costmap',
    '/projected_map',
];

const POSE_TOPIC_CANDIDATES = [
    '/hsrb/pose2D',
    '/robot_pose',
    '/amcl_pose',
];

interface MapInfo {
    width: number;
    height: number;
    resolution: number;
    originX: number;
    originY: number;
}

export default function MapCreator() {

    const [activeTab, setActiveTab] = useState(0);

    // ── Map Creator state ────────────────────────────────────────────────────
    const [fileContent, setFileContent] = useState<any>(null);
    const [selectedFile, setSelectedFile] = useState(null);

    const [mapLocModal, setMapLocModal] = useState([]);
    const onCloseModalFunc = (room_ind, loc_ind) => {
        var tmp = mapLocModal;
        tmp[room_ind][loc_ind] = false;
        setMapLocModal({ ...tmp });
    };

    const onOpenModalFunc = (room_ind, loc_ind) => {
        var tmp = mapLocModal;
        tmp[room_ind][loc_ind] = true;
        setMapLocModal({ ...tmp });
    };

    const [loadSource, setLoadSource] = useState<'file' | 'paste' | 'url' | null>(null);
    const [saveFileName, setSaveFileName] = useState('');
    const downloadAnchorRef = useRef<HTMLAnchorElement>(null);
    const handleSaveFile = async () => {
        const xmlString = await jsonToXml(fileContent);
        if (loadSource === 'url') {
            try {
                const res = await fetch(`http://${serverIp}:3001/save_xml?path=${saveFileName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: xmlString }),
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                alert(`保存しました: ${xmlPath}`);
            } catch (error) {
                alert(`サーバーへの保存に失敗しました: ${error.message}`);
            }
        } else {
            const link = downloadAnchorRef.current;
            if (!link) return;
            const blob = new Blob([xmlString], { type: 'text/xml;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', saveFileName);
            link.click();
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
    };

    const applyXml = (jsonTxt: any) => {
        var truefalseind = [];
        for (var i = 0; i < jsonTxt.locations.room.length; i++) {
            truefalseind.push([]);
            for (var j = 0; j < jsonTxt.locations.room[i].location.length; j++) {
                truefalseind[i].push(false);
            }
        }
        setMapLocModal(truefalseind);
        setOpenAddNewLocationModal(Array(truefalseind.length).fill(false));
        setFileContent(jsonTxt);
    };

    const handleFileLoad = async () => {
        if (!selectedFile) {
            alert('Please select a file first.');
            return;
        }
        if (!selectedFile.name.endsWith('.xml')) {
            alert('Please select a XML format file.');
            return;
        }

        try {
            const content = await readFile(selectedFile);
            const jsonTxt = await xmlToJson(content);
            applyXml(jsonTxt);
            setSaveFileName(selectedFile.name);
            setLoadSource('file');
        } catch (error) {
            console.error('Error reading file:', error);
            alert('Failed to read file. Please try again.');
        }
    };

    const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const handlePasteLoad = async () => {
        try {
            const jsonTxt = await xmlToJson(pasteText);
            applyXml(jsonTxt);
            setLoadSource('paste');
            setPasteDialogOpen(false);
            setPasteText('');
        } catch (error) {
            console.error('Error parsing XML:', error);
            alert('Failed to parse XML. Please check the content and try again.');
        }
    };

    const [urlDialogOpen, setUrlDialogOpen] = useState(false);
    const [serverIp, setServerIp] = useState('');
    const [xmlPath, setXmlPath] = useState('');
    const [urlError, setUrlError] = useState('');
    const builtUrl = serverIp && xmlPath ? `http://${serverIp}:3001/get_xml?path=${xmlPath}` : '';
    const handleUrlLoad = async () => {
        setUrlError('');
        if (!builtUrl) {
            setUrlError('IPアドレスとファイルパスを入力してください。');
            return;
        }
        try {
            const healthRes = await fetch(`http://${serverIp}:3001/get_task`).catch(() => null);
            if (!healthRes || !healthRes.ok) {
                setUrlError(`サーバー (${serverIp}:3001) に接続できません。erasers-server が起動しているか確認してください。`);
                return;
            }
        } catch {
            setUrlError(`サーバー (${serverIp}:3001) に接続できません。erasers-server が起動しているか確認してください。`);
            return;
        }
        try {
            const response = await fetch(builtUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const text = await response.text();
            const jsonTxt = await xmlToJson(text);
            applyXml(jsonTxt);
            setLoadSource('url');
            setSaveFileName(xmlPath);
            setUrlDialogOpen(false);
        } catch (error) {
            setUrlError(`XMLの読み込みに失敗しました: ${error.message}`);
        }
    };

    const [openAddNewLocationModal, setOpenAddNewLocationModal] = useState([]);
    const addNewLocation = (ri) => {
        const tmp = openAddNewLocationModal;
        tmp[ri] = true;
        setOpenAddNewLocationModal({ ...tmp });
    };
    const onCloseNewLocationModal = (ri) => {
        const tmp = openAddNewLocationModal;
        tmp[ri] = false;
        setOpenAddNewLocationModal({ ...tmp });
    };

    const [openAddNewRoomModal, setOpenAddNewRoomModal] = useState(false);
    const addNewRoom = () => { setOpenAddNewRoomModal(true); };
    const onCloseNewRoom = () => { setOpenAddNewRoomModal(false); };

    const { ros } = useRos();
    const [connectRos, setConnectRos] = useState(false);
    const [robotPose, setRobotPose] = useState<any>();
    const robotPoseSubRef = useRef<ROSLIB.Topic | null>(null);

    useEffect(() => {
        if (!connectRos || !ros) return;
        robotPoseSubRef.current = new ROSLIB.Topic({ ros, name: '/hsrb/pose2D', messageType: 'geometry_msgs/Pose2D' });
        robotPoseSubRef.current.subscribe(message => {
            setRobotPose(message);
        });
        return () => {
            if (robotPoseSubRef.current) {
                robotPoseSubRef.current.unsubscribe();
                robotPoseSubRef.current = null;
            }
        };
    }, [connectRos, ros]);

    useEffect(() => {
        if (fileContent) {
            var truefalseind = [];
            for (var i = 0; i < fileContent.locations.room.length; i++) {
                truefalseind.push([]);
                for (var j = 0; j < fileContent.locations.room[i].location.length; j++) {
                    truefalseind[i].push(false);
                }
            }
            setMapLocModal(truefalseind);
            setOpenAddNewLocationModal(Array(truefalseind.length).fill(false));
        }
    }, [fileContent]);

    // ── Map View state ───────────────────────────────────────────────────────
    const mapCanvasRef = useRef<HTMLCanvasElement>(null);
    const robotCanvasRef = useRef<HTMLCanvasElement>(null);
    const mapInfoRef = useRef<MapInfo | null>(null);
    const [hasMap, setHasMap] = useState(false);
    const [mapStatus, setMapStatus] = useState('Waiting for map...');

    const [mapTopicInput, setMapTopicInput] = useState('/map');
    const [poseTopicInput, setPoseTopicInput] = useState('/hsrb/pose2D');
    const [activeMaptopic, setActiveMaptopic] = useState('/map');
    const [activePoseTopic, setActivePoseTopic] = useState('/hsrb/pose2D');

    const handleSubscribe = () => {
        setActiveMaptopic(mapTopicInput.trim() || '/map');
        setActivePoseTopic(poseTopicInput.trim() || '/hsrb/pose2D');
    };

    useEffect(() => {
        if (!ros) return;

        const mapSub = new ROSLIB.Topic({ ros, name: activeMaptopic, messageType: 'nav_msgs/OccupancyGrid' });
        mapSub.subscribe((message: any) => {
            const { width, height, resolution } = message.info;
            const originX: number = message.info.origin.position.x;
            const originY: number = message.info.origin.position.y;
            mapInfoRef.current = { width, height, resolution, originX, originY };
            setMapStatus(`${activeMaptopic}  |  ${width}×${height} cells, ${resolution}m/cell`);
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
                    r = 180; g = 180; b = 180;
                } else if (val === 0) {
                    r = 255; g = 255; b = 255;
                } else {
                    const intensity = Math.round((1 - val / 100) * 200);
                    r = intensity; g = intensity; b = intensity;
                }
                imgData.data[i * 4]     = r;
                imgData.data[i * 4 + 1] = g;
                imgData.data[i * 4 + 2] = b;
                imgData.data[i * 4 + 3] = 255;
            }
            ctx.putImageData(imgData, 0, 0);
        });

        const poseSub = new ROSLIB.Topic({ ros, name: activePoseTopic, messageType: 'geometry_msgs/Pose2D' });
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

            const cx = (message.x - info.originX) / info.resolution;
            const cy = info.height - (message.y - info.originY) / info.resolution;
            const theta: number = message.theta;
            const r = Math.max(4, Math.round(0.25 / info.resolution));
            const arrowLen = Math.max(8, Math.round(0.5 / info.resolution));

            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(220, 50, 50, 0.85)';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = Math.max(1, r * 0.3);
            ctx.stroke();

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
    }, [ros, activeMaptopic, activePoseTopic]);

    return (
        <AppLayout>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header + Tabs */}
                <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                    <Box sx={{ px: 3, pt: 2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1565C0' }}>Map</Typography>
                    </Box>
                    <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ px: 2 }}>
                        <Tab label="Map Creator" />
                        <Tab label="Map View" />
                    </Tabs>
                </Box>

                {/* ── Tab 0: Map Creator ──────────────────────────────────── */}
                <Box sx={{ display: activeTab === 0 ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    {/* File operations toolbar */}
                    <Paper
                        elevation={0}
                        sx={{
                            m: 2,
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            flexWrap: 'wrap',
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Input type="file" onChange={handleFileChange} />
                        <Button variant="contained" startIcon={<FolderOpenIcon />} onClick={handleFileLoad}>
                            Load
                        </Button>
                        <Button variant="outlined" startIcon={<ContentPasteIcon />} onClick={() => setPasteDialogOpen(true)}>
                            Paste XML
                        </Button>
                        <Button variant="outlined" startIcon={<LinkIcon />} onClick={() => setUrlDialogOpen(true)}>
                            Load from URL
                        </Button>
                        <Divider orientation="vertical" flexItem />
                        <TextField
                            label={loadSource === 'url' ? 'Save path' : 'Filename (.xml)'}
                            size="small"
                            value={saveFileName}
                            onChange={(e) => setSaveFileName(e.target.value)}
                            sx={{ minWidth: 240 }}
                        />
                        <a ref={downloadAnchorRef} className='hidden' />
                        <Button variant="outlined" startIcon={<SaveIcon />} onClick={handleSaveFile} disabled={!fileContent}>
                            {loadSource === 'url' ? 'Save to Server' : 'Save'}
                        </Button>
                        <Divider orientation="vertical" flexItem />
                        <Chip
                            icon={<RouterIcon />}
                            label={connectRos ? 'Tracking Robot Pose' : 'Track Robot Pose'}
                            color={connectRos ? 'success' : 'default'}
                            variant={connectRos ? 'filled' : 'outlined'}
                            onClick={() => setConnectRos(true)}
                            clickable={!connectRos}
                        />
                        {robotPose && (
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                x:{robotPose.x?.toFixed(2)} y:{robotPose.y?.toFixed(2)} θ:{robotPose.theta?.toFixed(2)}
                            </Typography>
                        )}
                    </Paper>

                    <Box sx={{ flex: 1, overflow: 'auto', px: 2, pb: 2 }}>
                        {fileContent && mapLocModal && (
                            <Box sx={{ mb: 2 }}>
                                <Button variant="outlined" onClick={addNewRoom}>
                                    + Add Room
                                </Button>
                                <AddRoomModal isOpen={openAddNewRoomModal} onCloseFunc={onCloseNewRoom} fileContent={fileContent} setFunc={setFileContent} />
                            </Box>
                        )}

                        {fileContent && mapLocModal && (
                            fileContent.locations.room.map((room, room_index) => (
                                <Accordion key={room_index} elevation={2} sx={{ mb: 1, '&:before': { display: 'none' } }}>
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        aria-controls={`room-${room_index}-content`}
                                        id={`room-${room_index}-header`}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <PlaceIcon sx={{ color: '#1565C0', fontSize: '1.1rem' }} />
                                            <Typography sx={{ fontWeight: 600 }}>{room["$"].name}</Typography>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <AddNewLocationModal
                                            isOpen={openAddNewLocationModal[room_index]}
                                            onCloseFunc={onCloseNewLocationModal}
                                            fileContent={fileContent}
                                            setFileContentFunc={setFileContent}
                                            room_ind={room_index}
                                        />
                                        <Button size="small" variant="outlined" onClick={() => addNewLocation(room_index)} sx={{ mb: 1 }}>
                                            + Add Location
                                        </Button>
                                        <Divider sx={{ mb: 1 }} />

                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {mapLocModal[room_index] &&
                                                room.location.map((loc, loc_index) => (
                                                    <Box
                                                        key={loc_index}
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 2,
                                                            px: 2,
                                                            py: 1,
                                                            bgcolor: 'background.default',
                                                            borderRadius: 2,
                                                        }}
                                                    >
                                                        <PlaceIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} />
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{loc["$"].name}</Typography>
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                                                {loc["$"].global_position}
                                                            </Typography>
                                                        </Box>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => onOpenModalFunc(room_index, loc_index)}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <MapModal
                                                            isOpen={mapLocModal[room_index][loc_index]}
                                                            onCloseFunc={onCloseModalFunc}
                                                            room_ind={room_index}
                                                            loc_ind={loc_index}
                                                            fileContent={fileContent}
                                                            setFileContentFunc={setFileContent}
                                                            robotLocation={robotPose}
                                                        />
                                                    </Box>
                                                ))}
                                        </Box>
                                    </AccordionDetails>
                                </Accordion>
                            ))
                        )}
                    </Box>
                </Box>

                {/* ── Tab 1: Map View ─────────────────────────────────────── */}
                <Box sx={{ display: activeTab === 1 ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    {/* Topic selector toolbar */}
                    <Paper
                        elevation={0}
                        sx={{
                            m: 2,
                            p: 2,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 2,
                            flexWrap: 'wrap',
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <TextField
                                label="Map Topic"
                                size="small"
                                value={mapTopicInput}
                                onChange={e => setMapTopicInput(e.target.value)}
                                sx={{ minWidth: 260 }}
                            />
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {MAP_TOPIC_CANDIDATES.map(t => (
                                    <Chip
                                        key={t}
                                        label={t}
                                        size="small"
                                        variant={mapTopicInput === t ? 'filled' : 'outlined'}
                                        color={mapTopicInput === t ? 'primary' : 'default'}
                                        onClick={() => setMapTopicInput(t)}
                                    />
                                ))}
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <TextField
                                label="Pose Topic"
                                size="small"
                                value={poseTopicInput}
                                onChange={e => setPoseTopicInput(e.target.value)}
                                sx={{ minWidth: 220 }}
                            />
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {POSE_TOPIC_CANDIDATES.map(t => (
                                    <Chip
                                        key={t}
                                        label={t}
                                        size="small"
                                        variant={poseTopicInput === t ? 'filled' : 'outlined'}
                                        color={poseTopicInput === t ? 'primary' : 'default'}
                                        onClick={() => setPoseTopicInput(t)}
                                    />
                                ))}
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', pt: 0.5 }}>
                            <Button variant="contained" onClick={handleSubscribe}>
                                Subscribe
                            </Button>
                        </Box>

                        {hasMap && (
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', alignSelf: 'center' }}>
                                {mapStatus}
                            </Typography>
                        )}
                    </Paper>

                    {/* Canvas area */}
                    <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, bgcolor: '#f5f5f5' }}>
                        {hasMap ? (
                            <Box sx={{ position: 'relative', display: 'inline-block', boxShadow: 3 }}>
                                <canvas
                                    ref={mapCanvasRef}
                                    style={{ display: 'block', imageRendering: 'pixelated', maxWidth: '100%', maxHeight: 'calc(100vh - 260px)' }}
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
                            <Typography color="text.secondary">{mapStatus}</Typography>
                        )}
                    </Box>
                </Box>
            </Box>

            {/* ── Dialogs (shared) ──────────────────────────────────────── */}
            <Dialog open={pasteDialogOpen} onClose={() => setPasteDialogOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>Paste XML</DialogTitle>
                <DialogContent>
                    <TextField
                        multiline
                        rows={12}
                        fullWidth
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        placeholder="<?xml version=&quot;1.0&quot; ...?>"
                        sx={{ mt: 1, fontFamily: 'monospace' }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPasteDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handlePasteLoad}>Load</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={urlDialogOpen} onClose={() => { setUrlDialogOpen(false); setUrlError(''); }} fullWidth maxWidth="sm">
                <DialogTitle>Load from URL</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField
                        label="サーバー IP"
                        fullWidth
                        value={serverIp}
                        onChange={(e) => setServerIp(e.target.value)}
                        placeholder="192.168.1.10"
                    />
                    <TextField
                        label="ファイルパス"
                        fullWidth
                        value={xmlPath}
                        onChange={(e) => setXmlPath(e.target.value)}
                        placeholder="/home/roboworks/map.xml"
                    />
                    {builtUrl && (
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', wordBreak: 'break-all' }}>
                            {builtUrl}
                        </Typography>
                    )}
                    {urlError && (
                        <Typography variant="body2" color="error">
                            {urlError}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setUrlDialogOpen(false); setUrlError(''); }}>Cancel</Button>
                    <Button variant="contained" onClick={handleUrlLoad} disabled={!builtUrl}>Load</Button>
                </DialogActions>
            </Dialog>
        </AppLayout>
    );
}
