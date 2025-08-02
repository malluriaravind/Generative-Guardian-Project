import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { Box, Stack } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DialogProps } from "@mui/material";


type CustomDialogProps = DialogProps & {
  title: string;
  subtitle: string;
  onClose?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  actions?: JSX.Element;
}

const CustomDialog = ({
  title,
  subtitle,
  children,
  onClose,
  ...props
}: CustomDialogProps) => {
  const handleClose = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClose?.(event);
    },
    [onClose]
  );

  return (
    <Dialog
      fullWidth={true}
      onClose={handleClose}
      transitionDuration={{
        exit: 0,
        enter: 200,
      }}
      maxWidth="lg"
      {...props}
    >
      <Stack direction={"row"} alignContent={"center"}>
        <Box flexGrow={1}>
          <DialogTitle>{title}</DialogTitle>
        </Box>
        <Box flexGrow={0}>
          <DialogActions>
            <Button variant="grayed" onClick={handleClose}>
              <CloseIcon />
            </Button>
          </DialogActions>
        </Box>
      </Stack>

      <DialogContent>
        <DialogContentText>{subtitle}</DialogContentText>
        <Box marginY={1}>{children}</Box>
      </DialogContent>
    </Dialog>
  );
};

export default CustomDialog;
