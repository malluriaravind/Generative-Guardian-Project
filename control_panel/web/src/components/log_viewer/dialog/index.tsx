import { ReactNode } from 'react';
import { Button, Dialog, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';


type LogViewerDialogProps = {
    isPanelOpened: boolean;
    requestId: string | null;
    content: ReactNode;
    onClose: () => void;
};

const LogViewerDialog = ({isPanelOpened, content, onClose, requestId}: LogViewerDialogProps) => {
    const margin = '8px';
    return <Dialog
    open={isPanelOpened}
    onClose={onClose}
    fullWidth
    maxWidth={`calc(100vw - ${margin})`}
    sx={{ height: `calc(100vh - ${margin})` }}
  >
    <DialogTitle>
    <Stack direction='row' color='#1a3d7c' borderBottom='1px solid gray' alignItems='center' py='16px' gap='16px'>
        <Typography fontWeight='bold' variant='h5'>Audit Trail Details</Typography>
        {requestId ? (
        <Stack direction='row' gap='8px' color='#1a3d7c' bgcolor='rgba(0, 0, 0, 0.08)' p='4px' borderRadius='4px'>
          <Typography variant='h6' fontWeight='bold'>Request ID:</Typography>
          <Typography variant='h6' fontWeight='bold'>{requestId}</Typography>
        </Stack>
        ) : null}
        <Stack marginLeft="auto"><Button color='primary' onClick={onClose}><CloseIcon /></Button></Stack>
    </Stack>
    </DialogTitle>
    <DialogContent>
        {content}
    </DialogContent>
  </Dialog>;
};

export default LogViewerDialog;
