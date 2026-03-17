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

export default function MapCreator() {

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

    return (
        <AppLayout>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header */}
                <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1565C0' }}>Map Creator</Typography>
                </Box>

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
            {/* Paste XML Dialog */}
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

            {/* Load from URL Dialog */}
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
