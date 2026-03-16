import xml2js from 'xml2js';
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

async function xmlToJson(xml) {
    var res = null;
    xml2js.parseString(xml, function (err, result) {
        res = result;
    });
    return res;
}

async function jsonToXml(json_obj) {
    var builder = new xml2js.Builder();
    var xml = builder.buildObject(json_obj);
    return xml;
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

    const [saveFileName, setSaveFileName] = useState(null);
    const downloadAnchorRef = useRef<HTMLAnchorElement>(null);
    const handleSaveFile = async () => {
        const res = await jsonToXml(fileContent);
        const link = downloadAnchorRef.current;
        if (!link) return;
        const blob = new Blob([res], { type: 'text/xml;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', saveFileName);
        link.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
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

        } catch (error) {
            console.error('Error reading file:', error);
            alert('Failed to read file. Please try again.');
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
        return () => { };
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
                    <Divider orientation="vertical" flexItem />
                    <TextField
                        label="Filename (.xml)"
                        size="small"
                        defaultValue=""
                        onChange={(e) => setSaveFileName(e.target.value)}
                        sx={{ minWidth: 160 }}
                    />
                    <a ref={downloadAnchorRef} className='hidden' />
                    <Button variant="outlined" startIcon={<SaveIcon />} onClick={handleSaveFile}>
                        Save
                    </Button>
                    <Divider orientation="vertical" flexItem />
                    <Chip
                        icon={<RouterIcon />}
                        label={connectRos ? 'ROS Connected' : 'Connect ROS'}
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
        </AppLayout>
    );
}
