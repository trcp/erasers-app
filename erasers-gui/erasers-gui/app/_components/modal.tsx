import styles from './modal.module.css';
import { Modal, Box, Typography } from '@mui/material';
import Image from 'next/image';

import { useState } from 'react';
import { text } from 'stream/consumers';

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    height: '90%',
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

const textstyle = {
    fontSize: "h1.fontSize",
    overflowWrap: "break-word",
    hyphens: "auto"
}

export function MyModal({ isOpen, onClose, modalString }) {

    return (
        <>
            <Modal
                open={isOpen}
                onClose={onClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={style}>
                    <Typography id="modal-modal-title" variant="h3">
                        Robot said
                    </Typography>
                    <hr />
                    {/*<Typography id="modal-modal-description" sx={{ mt: 2 }} variant='h1' whiteSpace={'pre-line'}>
                        {modalString}
    </Typography>*/}
                    <Box sx={textstyle}>
                        {modalString}
                    </Box>
                </Box>
            </Modal>
        </>
    );
}

export function EmergencyModal({ isOpen }) {
    return (
        <>
            <Modal
                open={isOpen}
                // onClose={onClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography id="modal-modal-title" variant="h3">
                        Emergency Button Enable
                    </Typography>
                    <hr />
                    <Box sx={{ position: 'relative', width: '90%', height: '90%' }}>
                        <Image
                            src="/emergency.gif"
                            alt="Description"
                            fill
                        />
                    </Box>
                </Box>
            </Modal>
        </>
    )
}

export function ImageModal({ imageTopicName, hostName }) {
    var url = `http://${hostName}:8901/stream?topic=${imageTopicName}&type=ros_compressed`;

    var isOpen = false;
    if (imageTopicName != "") {
        isOpen = true
    }

    return (
        <>
            <Modal
                open={isOpen}
                // onClose={onClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography id="modal-modal-title" variant="h3">
                        Emergency Button Enable
                    </Typography>
                    <hr />
                    <Box sx={{ position: 'relative', width: '90%', height: '90%', textAlign: 'center' }}>
                        <img src={url} alt="dev logo" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                    </Box>
                </Box>
            </Modal>
        </>
    )
}