import { useState } from "react";
import { Version } from "../../../types/maintenance";
import {
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  Button,
} from "@mui/material";

type HeartBeatsPopupProps = {
  versions?: Version[];
};

const HeartBeatsPopup = ({ versions }: HeartBeatsPopupProps) => {
  const [openHeartbeatsPopup, setOpenHeartbeatsPopup] = useState(false);

  const handleOpen = () => {
    setOpenHeartbeatsPopup(true);
  };

  const handleClose = () => {
    setOpenHeartbeatsPopup(false);
  };

  if (!versions || !Array.isArray(versions) || versions.length <= 2) {
    return null;
  }

  return (
    <>
      <Button
        onClick={handleOpen}
        fullWidth
        sx={{fontSize: '10px'}}
      >
        show other versions
      </Button>

      <Dialog
        open={openHeartbeatsPopup}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Versions</DialogTitle>
        <DialogContent dividers sx={{ maxHeight: 400 }}>
          <List>
            {versions.map((item, index) => (
              <ListItem key={index} sx={{ display: "block", mb: 2 }}>
                <Typography variant="body2" fontFamily='sans-serif'>
                  <strong>Version:</strong> {item.version} |{" "}
                  <strong>App Name:</strong> {item.appname} |{" "}
                  <strong>Hostname:</strong> {item.hostname} |{" "}
                  <strong>Repr Version:</strong> {item.reprversion}
                  {typeof item.addresses === 'undefined' ? null : <>{" | "}<strong>Addresses:</strong> {item.addresses?.join(", ")}</>}
                </Typography>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HeartBeatsPopup;
