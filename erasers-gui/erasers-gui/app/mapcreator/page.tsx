'use client'

import xml2js from 'xml2js';
import ROSLIB from 'roslib'
import { RosInterface } from '../scripts/ros'

import React, { useEffect, useRef, useState } from 'react';
import {
    Button,
    Container,
    Paper,
    Typography,
    Input,
    Box,
    Autocomplete,
    TextField,
    Divider
} from '@mui/material';

import Accordion from '@mui/material/Accordion';
import AccordionActions from '@mui/material/AccordionActions';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import BasicSpeedDial from '../_components/speeddial';

import { AddNewLocationModal, AddRoomModal, MapModal } from './_components/modal'

const hostNname = process.env.NEXT_PUBLIC_MASTER_HOSTNAME

const top100Films = [
    { title: 'The Shawshank Redemption', year: 1994 },
    { title: 'The Godfather', year: 1972 },
    { title: 'The Godfather: Part II', year: 1974 },
];

async function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            resolve(event.target.result);
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsText(file);
    });
}

async function xmlToJson(xml) {
    var res = null;
    xml2js.parseString(xml, function (err, result) {
        // console.log("call xml parser-> ", result);
        res = result;
    });
    return res
}

async function jsonToXml(json_obj) {
    var builder = new xml2js.Builder();
    var xml = builder.buildObject(json_obj);
    return xml
}

export default function MapCreator() {

    const [fileContent, setFileContent] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    const [mapLocModal, setMapLocModal] = useState([]);
    const onCloseModalFunc = (room_ind, loc_ind) => {
        console.log("modal open with index", room_ind, loc_ind);
        var tmp = mapLocModal;
        tmp[room_ind][loc_ind] = false;
        setMapLocModal({ ...tmp });
    }

    const onOpenModalFunc = (room_ind, loc_ind) => {
        console.log("modal open with index", room_ind, loc_ind);
        var tmp = mapLocModal;
        tmp[room_ind][loc_ind] = true;
        setMapLocModal({ ...tmp });
    }

    const [saveFileName, setSaveFileName] = useState(null);
    const downloadAnchorRef = useRef<HTMLAnchorElement>(null);
    const handleSaveFile = async () => {
        // console.log("save file name with this name -> ", saveFileName)
        const res = await jsonToXml(fileContent);
        // console.log("result xml is", res);

        const link = downloadAnchorRef.current
        if (!link) return

        const blob = new Blob([res], { type: 'text/xml;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', saveFileName)
        link.click()
    }

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

            console.log(jsonTxt)
            /*
            for (var i = 0; i < jsonTxt.locations.room.length; i++) {
                console.log("room name is ", jsonTxt.locations.room[i]["$"])
                for (var j = 0; j < jsonTxt.locations.room[i].location.length; j++) {
                    console.log("location is ", jsonTxt.locations.room[i].location[j]["$"]);
                }
                console.log("----------------------------------------------")
            }
            */
            var truefalseind = []
            for (var i = 0; i < jsonTxt.locations.room.length; i++) {
                truefalseind.push([]);
                for (var j = 0; j < jsonTxt.locations.room[i].location.length; j++) {
                    truefalseind[i].push(false);
                }
            }

            console.log("true false index is -> ", truefalseind)
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
    }
    const onCloseNewLocationModal = (ri) => {
        const tmp = openAddNewLocationModal;
        tmp[ri] = false;
        setOpenAddNewLocationModal({ ...tmp });
    }

    const [openAddNewRoomModal, setOpenAddNewRoomModal] = useState(false);
    const addNewRoom = () => {
        setOpenAddNewRoomModal(true);
    }
    const onCloseNewRoom = () => {
        setOpenAddNewRoomModal(false);
    }

    // useEffect for ros connection
    const [connectRos, setConnectRos] = useState(false);
    const [robotPose, setRobotPose] = useState();
    useEffect(() => {
        // var robotPoseSub;
        if (connectRos) {
            console.log("connect to ROS");

            const ros_interface = new RosInterface(hostNname)

            const robotPoseSub = new ROSLIB.Topic({ ros: ros_interface.ros, name: '/hsrb/pose2D', messageType: 'geometry_msgs/Pose2D' });
            robotPoseSub.subscribe(message => {
                // console.log(message);
                setRobotPose(message);
            });
        }
        return (robotPoseSub) => {
            if (robotPoseSub) {
                robotPoseSub.unsubscribe();
            }
        }
    }, [connectRos])

    useEffect(() => {
        if (fileContent) {
            console.log('useEffect filecontent', fileContent);
            var truefalseind = []
            for (var i = 0; i < fileContent.locations.room.length; i++) {
                truefalseind.push([]);
                for (var j = 0; j < fileContent.locations.room[i].location.length; j++) {
                    truefalseind[i].push(false);
                }
            }

            console.log("useEffect -> ", truefalseind)
            setMapLocModal(truefalseind);
            setOpenAddNewLocationModal(Array(truefalseind.length).fill(false));
        }
        return () => { };
    }, [fileContent]);

    return (
        <>
            <Box sx={{ width: "100%", height: "100%" }}>
                <Typography variant="h3" sx={{ m: 2 }}>Map creator</Typography>
                <hr />
                <BasicSpeedDial />
                <Box m={2} sx={{ display: 'flex', alignContent: 'center', alignItems: 'center', justifyContent: 'center' }}>
                    <Input type="file" onChange={handleFileChange} />
                    <Button variant="contained" color="primary" onClick={handleFileLoad} style={{ marginLeft: 20 }}>
                        Load File
                    </Button>

                    <Box sx={{ marginLeft: 1, alignContent: 'center', alignItems: 'center', display: 'flex' }}>
                        <TextField
                            label="xml name"
                            defaultValue={""}
                            onChange={(e) => setSaveFileName(e.target.value)}
                        />
                        <a ref={downloadAnchorRef} className='hidden'></a>
                        <Button variant="contained" color="primary" onClick={handleSaveFile} style={{ marginLeft: 20 }}>
                            Save
                        </Button>
                    </Box>

                    <Box sx={{ marginLeft: 3 }}>
                        <Button onClick={() => setConnectRos(true)}>Connect ROS</Button>
                    </Box>
                </Box>

                <Box m={10}>
                    {fileContent && mapLocModal && (
                        <div>
                            <Button onClick={() => addNewRoom()}>Add Room</Button>
                            <AddRoomModal isOpen={openAddNewRoomModal} onCloseFunc={onCloseNewRoom} fileContent={fileContent} setFunc={setFileContent} />
                        </div>
                    )}

                    {fileContent && mapLocModal && (
                        fileContent.locations.room.map((room, room_index) => (
                            <Accordion key={room_index}>
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    aria-controls={`room-${room_index}-content`}
                                    id={`room-${room_index}-header`}
                                >
                                    {/* <Box> {JSON.stringify(room["$"])} </Box> */}
                                    <Box>Room: {room["$"].name}</Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <div>
                                        <AddNewLocationModal
                                            isOpen={openAddNewLocationModal[room_index]}
                                            onCloseFunc={onCloseNewLocationModal}
                                            fileContent={fileContent}
                                            setFileContentFunc={setFileContent}
                                            room_ind={room_index}
                                        />
                                        <Button onClick={() => addNewLocation(room_index)} >Add location</Button>
                                        <Divider sx={{ m: 1 }} />

                                        {mapLocModal[room_index] &&
                                            room.location.map((loc, loc_index) => (
                                                <div key={loc_index}>
                                                    <div>
                                                        {/* <div>loc name is {JSON.stringify(loc["$"])}</div> */}
                                                        <div> Name: {loc["$"].name}, Location: {loc["$"].global_position} </div>
                                                    </div>
                                                    <Button onClick={() => onOpenModalFunc(room_index, loc_index)}> modified </Button>
                                                    <MapModal
                                                        isOpen={mapLocModal[room_index][loc_index]}
                                                        onCloseFunc={onCloseModalFunc}
                                                        room_ind={room_index}
                                                        loc_ind={loc_index}
                                                        fileContent={fileContent}
                                                        setFileContentFunc={setFileContent}
                                                        robotLocation={robotPose}
                                                    />
                                                    {/* <Button>get loc</Button> */}
                                                </div>
                                            ))}
                                    </div>
                                </AccordionDetails>
                            </Accordion>
                        ))
                    )}
                </Box>
            </Box>
        </>
    );
}
