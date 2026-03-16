import { Modal, Box, Typography, Button, TextField } from '@mui/material';

import { useState, useEffect } from 'react';

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '50%',
    height: '50%',
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

export function AddRoomModal({ isOpen, onCloseFunc, fileContent, setFunc }) {
    // $ :  {name: 'living room', position: '0.0 0.0 0.0 0.0'}
    var name = "";
    const addRoom = () => {
        console.log('clicked')
        const newRoom = {
            "$": { "name": null, position: "0.0 0.0 0.0 0.0 0.0" },
            "location": [{ "$": { name: 'dummy', global_position: '0.0 0.0 0.0 0.0', put_position: '0 0 0', isDoor: 'false' } }]
        }
        newRoom["$"]["name"] = name;

        const tmp = fileContent;
        tmp.locations.room.unshift(newRoom);
        setFunc({ ...tmp })
        onCloseFunc();
    }

    return (
        <Modal
            open={isOpen}
            // onClose={onClose}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
        >
            <Box sx={style}>
                <Typography id="modal-modal-title" variant="h6">
                    Add Room
                </Typography>
                <hr />

                <Box p={1}>
                    <TextField
                        label="room name"
                        defaultValue={""}
                        onChange={(e) => name = e.target.value}
                    />
                </Box>
                <Box sx={{ position: 'absolute', bottom: 10, right: 10 }}>
                    <Button onClick={onCloseFunc}>Cancel</Button>
                    <Button onClick={addRoom}>Add</Button>
                </Box>
            </Box>
        </Modal >
    )
}


export function AddNewLocationModal({ isOpen, onCloseFunc, room_ind, fileContent, setFileContentFunc }) {

    // {name: 'entrance', global_position: '0.0 4.10 0.0 0.0', put_position: '0 0 0', isDoor: 'false'}

    const [newValue, setNewValue] = useState({});

    useEffect(() => {
        setNewValue({ "name": '', "x": 0, "y": 0, "z": 0, "theta": 0 });
    }, [isOpen]);

    const addLocation = () => {
        const newlocation = { "$": { "name": null, "global_position": null, put_position: '0 0 0', isDoor: 'false' } }
        newlocation["$"]["name"] = newValue["name"]
        newlocation["$"]["global_position"] = `${newValue["x"]} ${newValue["y"]} ${newValue["z"]} ${newValue["theta"]}`;
        fileContent.locations.room[room_ind].location.unshift(newlocation);
        setFileContentFunc({ ...fileContent });
        onCloseFunc(room_ind);
    }

    const setNV = (k, v) => {
        newValue[k] = v;
        setNewValue({ ...newValue });
        console.log(newValue);
    }

    return (
        <>
            <Modal
                open={isOpen}
                // onClose={onClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={style}>
                    <Typography id="modal-modal-title" variant="h6">
                        Add Location
                    </Typography>
                    <hr />

                    <Box p={1}>
                        <TextField
                            label="location name"
                            defaultValue={newValue["name"]}
                            // onChange={(e) => console.log(e.target.value)}
                            onChange={(e) => setNV("name", e.target.value)}
                        />
                    </Box>
                    <Box p={1}>
                        <TextField
                            label="position x"
                            defaultValue={newValue["x"]}
                            // onChange={(e) => console.log(e.target.value)}
                            onChange={(e) => setNV("x", Number(e.target.value))}
                        />
                        <TextField
                            label="position y"
                            defaultValue={newValue["y"]}
                            // onChange={(e) => console.log(e.target.value)}
                            onChange={(e) => setNV("y", Number(e.target.value))}
                        />
                        <TextField
                            label="height z"
                            defaultValue={newValue["z"]}
                            // onChange={(e) => console.log(e.target.value)}
                            onChange={(e) => setNV("z", Number(e.target.value))}
                        />
                        <TextField
                            label="position theta"
                            defaultValue={newValue["theta"]}
                            // onChange={(e) => console.log(e.target.value)}
                            onChange={(e) => setNV("theta", Number(e.target.value))}
                        />
                    </Box>
                    <Box sx={{ position: 'absolute', bottom: 10, right: 10 }}>
                        <Button onClick={() => onCloseFunc(room_ind)}>Cancel</Button>
                        <Button onClick={() => addLocation()}>Add</Button>
                    </Box>
                </Box>
            </Modal>
        </>
    );
}

export function MapModal({ isOpen, onCloseFunc, room_ind, loc_ind, fileContent, setFileContentFunc, robotLocation }) {

    const [inputValue, setInputValue] = useState({})

    useEffect(() => {
        console.log('called useeffect inside modal')
        setInputValue({
            "name": fileContent.locations.room[room_ind].location[loc_ind]["$"].name,
            "x": fileContent.locations.room[room_ind].location[loc_ind]["$"].global_position.split(' ')[0],
            "y": fileContent.locations.room[room_ind].location[loc_ind]["$"].global_position.split(' ')[1],
            "z": fileContent.locations.room[room_ind].location[loc_ind]["$"].global_position.split(' ')[2],
            "theta": fileContent.locations.room[room_ind].location[loc_ind]["$"].global_position.split(' ')[3]
        })
    }, [isOpen])

    const updateFunc = () => {
        console.log("update with -> ", inputValue);

        fileContent.locations.room[room_ind].location[loc_ind]["$"].name = inputValue["name"]
        fileContent.locations.room[room_ind].location[loc_ind]["$"].global_position = `${inputValue['x']} ${inputValue['y']} ${inputValue['z']} ${inputValue['theta']}`;
        setFileContentFunc({ ...fileContent });
        onCloseFunc(room_ind, loc_ind);
    }

    const setNowLocation = () => {
        inputValue["x"] = robotLocation.x;
        inputValue["y"] = robotLocation.y;
        inputValue["theta"] = robotLocation.theta;
        console.log('inputvalue in ros', inputValue);
        setInputValue({ ...inputValue });
    }

    const setIV = (k, v) => {
        inputValue[k] = v;
        console.log(inputValue);
        setInputValue({ ...inputValue });
    }

    return (
        <>
            <Modal
                open={isOpen}
                // onClose={onClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={style}>
                    <Typography id="modal-modal-title" variant="h6">
                        Update Location
                    </Typography>
                    <hr />
                    <Box sx={{ overflow: "auto", height: '100%' }}>
                        <Box>{JSON.stringify(fileContent.locations.room[room_ind].location[loc_ind]["$"])}</Box>
                        <Box p={1}>
                            <TextField
                                label="location name"
                                defaultValue={inputValue["name"]}
                                value={inputValue["name"]}
                                // onChange={(e) => console.log(e.target.value)}
                                onChange={(e) => setIV("name", e.target.value)}
                            />
                        </Box>
                        <Button onClick={() => setNowLocation()}>Get Now Location</Button>
                        <Box p={1}>
                            <TextField
                                label="position x"
                                defaultValue={inputValue["x"]}
                                value={inputValue["x"]}
                                // onChange={(e) => console.log(e.target.value)}
                                onChange={(e) => setIV("x", Number(e.target.value))}
                            />
                            <TextField
                                label="position y"
                                defaultValue={inputValue["y"]}
                                value={inputValue["y"]}
                                // onChange={(e) => console.log(e.target.value)}
                                onChange={(e) => setIV("y", Number(e.target.value))}
                            />
                            <TextField
                                label="height z"
                                defaultValue={inputValue["z"]}
                                value={inputValue["z"]}
                                // onChange={(e) => console.log(e.target.value)}
                                onChange={(e) => setIV("z", Number(e.target.value))}
                            />
                            <TextField
                                label="position theta"
                                defaultValue={inputValue["theta"]}
                                value={inputValue["theta"]}
                                // onChange={(e) => console.log(e.target.value)}
                                onChange={(e) => setIV("theta", Number(e.target.value))}
                            />
                        </Box>
                    </Box>
                    <Box sx={{ position: 'absolute', bottom: 10, right: 10 }}>
                        <Button onClick={() => onCloseFunc(room_ind, loc_ind)}> Cancel </Button>
                        <Button onClick={() => updateFunc()}> Update </Button>
                    </Box>
                </Box>
            </Modal>
        </>
    );
}