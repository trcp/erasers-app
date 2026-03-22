import { Modal, Box, Typography, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    height: '80%',
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

const textstyle = {
    fontSize: "h2.fontSize",
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
                    <Box sx={textstyle}>
                        {modalString}
                    </Box>
                </Box>
            </Modal>
        </>
    );
}

export function EmergencyModal({ isOpen, onClose }) {
    return (
        <>
            <Modal
                open={isOpen}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Typography id="modal-modal-title" variant="h3">
                            Emergency Button Enable
                        </Typography>
                        <Button variant="outlined" color="inherit" size="small" startIcon={<CloseIcon />} onClick={onClose}>
                            Close
                        </Button>
                    </Box>
                    <hr style={{ width: '100%' }} />
                    <Box sx={{ position: 'relative', width: '90%', height: '90%' }}>
                        <img
                            src="/emergency.gif"
                            alt="Emergency"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
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
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{ position: 'relative', width: '90%', height: '90%', textAlign: 'center' }}>
                        <img src={url} alt="camera stream" style={{ display: 'inline-block', verticalAlign: 'middle', height: '90%' }} />
                    </Box>
                </Box>
            </Modal>
        </>
    )
}
