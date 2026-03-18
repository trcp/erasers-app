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

const MAP_MSG_TYPE = 'nav_msgs/OccupancyGrid';
const POSE_MSG_TYPE = 'geometry_msgs/Pose2D';

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

    const [mapTopicCandidates, setMapTopicCandidates] = useState<string[]>([]);
    const [poseTopicCandidates, setPoseTopicCandidates] = useState<string[]>([]);

    // ── Map View state ───────────────────────────────────────────────────────
    const viewerDivRef = useRef<HTMLDivElement>(null);
    const ros2dViewerRef = useRef<any>(null);
    const robotMarkerRef = useRef<any>(null);
    const [hasMap, setHasMap] = useState(false);
    const [mapStatus, setMapStatus] = useState('Waiting for map...');

    const [mapTopicInput, setMapTopicInput] = useState('');
    const [poseTopicInput, setPoseTopicInput] = useState('');
    const [activeMaptopic, setActiveMaptopic] = useState('');
    const [activePoseTopic, setActivePoseTopic] = useState('');

    useEffect(() => {
        if (!ros) return;
        ros.getTopics(
            (result: { topics: string[]; types: string[] }) => {
                const mapOpts: string[] = [];
                const poseOpts: string[] = [];
                result.topics.forEach((topic, i) => {
                    if (result.types[i] === MAP_MSG_TYPE) mapOpts.push(topic);
                    if (result.types[i] === POSE_MSG_TYPE) poseOpts.push(topic);
                });
                console.log('[MapCreator] All topics:', result.topics.map((t, i) => `${t} (${result.types[i]})`));
                console.log('[MapCreator] Map topic candidates:', mapOpts);
                console.log('[MapCreator] Pose topic candidates:', poseOpts);
                setMapTopicCandidates(mapOpts);
                setPoseTopicCandidates(poseOpts);
                if (mapOpts.length > 0) setMapTopicInput(mapOpts[0]);
                if (poseOpts.length > 0) setPoseTopicInput(poseOpts[0]);
            },
            (error: any) => console.error('getTopics error:', error)
        );
    }, [ros]);

    useEffect(() => {
        if (!connectRos || !ros) return;
        robotPoseSubRef.current = new ROSLIB.Topic({ ros, name: poseTopicInput, messageType: POSE_MSG_TYPE });
        robotPoseSubRef.current.subscribe(message => {
            setRobotPose(message);
        });
        return () => {
            if (robotPoseSubRef.current) {
                robotPoseSubRef.current.unsubscribe();
                robotPoseSubRef.current = null;
            }
        };
    }, [connectRos, ros, poseTopicInput]);

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

    const handleSubscribe = () => {
        setActiveMaptopic(mapTopicInput.trim());
        setActivePoseTopic(poseTopicInput.trim());
    };

    useEffect(() => {
        if (!ros || !activeMaptopic || !viewerDivRef.current) return;
        const ROS2D = (window as any).ROS2D;
        if (!ROS2D) return;

        const container = viewerDivRef.current;
        const viewer = new ROS2D.Viewer({
            divID: container.id,
            width: container.clientWidth || 800,
            height: container.clientHeight || 600,
        });
        ros2dViewerRef.current = viewer;

        // Robot marker (in ROS world coords = meters; scene transform scales it automatically)
        const createjs = (window as any).createjs;
        if (createjs) {
            const marker = new createjs.Container();
            const circle = new createjs.Shape();
            circle.graphics.beginFill('rgba(220,50,50,0.85)').drawCircle(0, 0, 0.3);
            const arrow = new createjs.Shape();
            arrow.graphics.setStrokeStyle(0.08).beginStroke('#FFD700').moveTo(0, 0).lineTo(0.7, 0);
            marker.addChild(circle, arrow);
            viewer.scene.addChild(marker);
            robotMarkerRef.current = marker;
        }

        // Subscribe manually to access raw data for obstacle bounding box cropping
        let currentGrid: any = null;
        const mapSub = new ROSLIB.Topic({ ros, name: activeMaptopic, messageType: MAP_MSG_TYPE });
        mapSub.subscribe((message: any) => {
            const { width, height, resolution } = message.info;
            const poseX: number = message.info.origin.position.x;
            const poseY: number = message.info.origin.position.y;
            const data: number[] = message.data;

            // Find bounding box of obstacle cells (value > 0) in data coordinates
            // ROS OccupancyGrid: row 0 = bottom of map (min Y), row height-1 = top (max Y)
            let minRow = height, maxRow = -1, minCol = width, maxCol = -1;
            for (let row = 0; row < height; row++) {
                for (let col = 0; col < width; col++) {
                    if (data[col + row * width] > 0) {
                        if (row < minRow) minRow = row;
                        if (row > maxRow) maxRow = row;
                        if (col < minCol) minCol = col;
                        if (col > maxCol) maxCol = col;
                    }
                }
            }
            // Fallback to full map if no obstacles found
            if (maxRow === -1) { minRow = 0; maxRow = height - 1; minCol = 0; maxCol = width - 1; }

            // Add padding cells
            const pad = 20;
            minRow = Math.max(0, minRow - pad);
            maxRow = Math.min(height - 1, maxRow + pad);
            minCol = Math.max(0, minCol - pad);
            maxCol = Math.min(width - 1, maxCol + pad);

            // Convert bounding box to ROS2D scene coordinates (meters, Y-flipped)
            // ros2d OccupancyGrid places bitmap row 0 at scene_y = -height_m - poseY
            // scene_y for data row dr = -poseY - (dr + 1) * resolution  (bottom edge of cell)
            // Bounding box: data rows [minRow..maxRow], data cols [minCol..maxCol]
            const bbXMin = poseX + minCol * resolution;
            const bbXMax = poseX + (maxCol + 1) * resolution;
            const bbYMin = -poseY - (maxRow + 1) * resolution; // top in scene (more negative = higher on canvas)
            const bbYMax = -poseY - minRow * resolution;        // bottom in scene
            const bbW = bbXMax - bbXMin;
            const bbH = bbYMax - bbYMin;

            // Uniform scale + center bounding box in canvas
            const scale = Math.min(viewer.width / bbW, viewer.height / bbH);
            viewer.scene.scaleX = scale;
            viewer.scene.scaleY = scale;
            viewer.scene.x = (viewer.width - bbW * scale) / 2 - bbXMin * scale;
            viewer.scene.y = (viewer.height - bbH * scale) / 2 - bbYMin * scale;

            // Swap in new OccupancyGrid bitmap
            if (currentGrid) viewer.scene.removeChild(currentGrid);
            currentGrid = new ROS2D.OccupancyGrid({ message });
            viewer.scene.addChildAt(currentGrid, 0);

            mapSub.unsubscribe();
            setHasMap(true);
            setMapStatus(`${activeMaptopic} | ${bbW.toFixed(1)}×${bbH.toFixed(1)} m`);
        });

        // Zoom (mouse wheel) and pan (drag)
        const canvas = container.querySelector('canvas');
        const abortCtrl = new AbortController();
        const sig = { signal: abortCtrl.signal };
        if (canvas) {
            const zoomView = new ROS2D.ZoomView({ rootObject: viewer.scene });
            const panView = new ROS2D.PanView({ rootObject: viewer.scene });
            let isPanning = false;

            canvas.addEventListener('wheel', (e: WheelEvent) => {
                e.preventDefault();
                const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
                const rect = (canvas as HTMLCanvasElement).getBoundingClientRect();
                zoomView.startZoom(e.clientX - rect.left, e.clientY - rect.top);
                zoomView.zoom(factor);
            }, { ...sig, passive: false });

            canvas.addEventListener('mousedown', (e: MouseEvent) => {
                isPanning = true;
                panView.startPan(e.clientX, e.clientY);
            }, sig);
            canvas.addEventListener('mousemove', (e: MouseEvent) => {
                if (!isPanning) return;
                panView.pan(e.clientX, e.clientY);
            }, sig);
            canvas.addEventListener('mouseup', () => { isPanning = false; }, sig);
            canvas.addEventListener('mouseleave', () => { isPanning = false; }, sig);
        }

        return () => {
            mapSub.unsubscribe();
            abortCtrl.abort();
            const marker = robotMarkerRef.current;
            if (marker?.parent) marker.parent.removeChild(marker);
            container.querySelector('canvas')?.remove();
            ros2dViewerRef.current = null;
            robotMarkerRef.current = null;
            setHasMap(false);
            setMapStatus('Waiting for map...');
        };
    }, [ros, activeMaptopic]);

    useEffect(() => {
        if (!ros || !activePoseTopic) return;
        const poseSub = new ROSLIB.Topic({ ros, name: activePoseTopic, messageType: POSE_MSG_TYPE });
        poseSub.subscribe((message: any) => {
            const marker = robotMarkerRef.current;
            if (!marker) return;
            // Marker is a child of viewer.scene, so position in ROS world coords (meters).
            // EaselJS applies the scene transform (scale + offset) automatically.
            marker.x = message.x;
            marker.y = -message.y;  // Y-flip: ROS Y-up → canvas Y-down
            marker.rotation = -message.theta * (180 / Math.PI);
        });
        return () => poseSub.unsubscribe();
    }, [ros, activePoseTopic]);

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
                                {mapTopicCandidates.length === 0
                                    ? <Typography variant="caption" color="text.secondary">No {MAP_MSG_TYPE} topics found</Typography>
                                    : mapTopicCandidates.map(t => (
                                        <Chip
                                            key={t}
                                            label={t}
                                            size="small"
                                            variant={mapTopicInput === t ? 'filled' : 'outlined'}
                                            color={mapTopicInput === t ? 'primary' : 'default'}
                                            onClick={() => setMapTopicInput(t)}
                                        />
                                    ))
                                }
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
                                {poseTopicCandidates.length === 0
                                    ? <Typography variant="caption" color="text.secondary">No {POSE_MSG_TYPE} topics found</Typography>
                                    : poseTopicCandidates.map(t => (
                                        <Chip
                                            key={t}
                                            label={t}
                                            size="small"
                                            variant={poseTopicInput === t ? 'filled' : 'outlined'}
                                            color={poseTopicInput === t ? 'primary' : 'default'}
                                            onClick={() => setPoseTopicInput(t)}
                                        />
                                    ))
                                }
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
                    <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative', bgcolor: '#f5f5f5' }}>
                        {!hasMap && (
                            <Typography color="text.secondary" sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1 }}>
                                {mapStatus}
                            </Typography>
                        )}
                        <div
                            id="ros2d-map-viewer"
                            ref={viewerDivRef}
                            style={{ width: '100%', height: '100%' }}
                        />
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
