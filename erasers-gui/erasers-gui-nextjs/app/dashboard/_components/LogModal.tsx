import { Box, Modal, Typography, Button, Checkbox, FormControlLabel } from "@mui/material";
import { useEffect, useRef, useState } from "react";

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
    height: '80%'
};

export default function LogModal({ openModal }) {

    const [log, setLog] = useState([]);

    const [connection, setConnection] = useState(null);
    const connectWebSocket = (taskName: string, nodeName: string) => {
        console.log(`LOG button clicked for ${nodeName}`);
        const conn = new WebSocket(`ws://localhost:3001/ws/${taskName}/${nodeName}`);

        conn.onopen = function (event) {
            console.log('get connected', event.data);
        };

        conn.onerror = function (error) {
            console.log("error occured", error.data);
        };

        conn.onmessage = function (event) {
            // console.log("receive message", event.data);
            setLog((prevLog) => [...prevLog, event.data]);
        };

        conn.onclose = function () {
            console.log("connection CLOSED");
        };
        return conn;
    }

    const [isOpen, setIsOpen] = useState(false);
    const closeLogModal = () => {
        connection.close(1000);
        setLog([])
        setIsOpen(false);
    }

    const openLogModal = () => {
        console.log("here open modal set to ", openModal);
        setIsOpen(true);
    }

    useEffect(() => {
        if (openModal.length == 2) {
            const conn = connectWebSocket(openModal[0], openModal[1]);
            setConnection(conn);
            openLogModal();
        }
        return () => { };
    }, [openModal]);

    useEffect(() => {
        if (scroll) {
            scrollBottomRef?.current?.scrollIntoView();
        }
    }, [log])

    const scrollBottomRef = useRef(null);
    const [scroll, setStopScroll] = useState(true);

    return (
        <>
            <Modal
                open={isOpen}
                onClose={closeLogModal}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={style}>
                    <Box sx={{ overflowY: "auto", height: "90%", p: '1' }}>
                        <div>
                            {log.map((item, index) => (
                                <p key={index}>{item}</p>
                            ))}
                            <div ref={scrollBottomRef} />
                        </div>
                    </Box>
                    <Box width={"100%"} id="debug">
                        <Box sx={{display: 'flex', justifyContent: 'flex-end',}}>
                            <FormControlLabel
                                label="Scroll"
                                control={<Checkbox checked={scroll} onChange={(e) => { setStopScroll(e.target.checked) }} />}
                            />
                            <Button onClick={closeLogModal}>CLOSE</Button>
                        </Box>
                    </Box>
                </Box>
            </Modal>
        </>
    )
}