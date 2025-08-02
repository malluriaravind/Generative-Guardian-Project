import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

type DeleteAlertDialogProps = {
  handleDeleteButton: () => void;
  isOpened: boolean;
  setIsOpened: (value: boolean) => void;
  dialogText?: string | null;
  dialogTitle: string;
};

const DeleteAlertDialog = ({
  isOpened,
  setIsOpened,
  handleDeleteButton,
  dialogTitle,
  dialogText,
}: DeleteAlertDialogProps) => {
  const onHandleSubmit = (func: () => void) => {
    func();
    setIsOpened(false);
  };
  return (
    <Dialog
      open={isOpened}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{dialogTitle}</DialogTitle>
      {dialogText ? (
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {dialogText}
          </DialogContentText>
        </DialogContent>
      ) : null}
      <DialogActions>
        <Button
          onClick={() => {
            setIsOpened(false);
          }}
        >
          Cancel
        </Button>
        <Button
          color="error"
          onClick={() => onHandleSubmit(handleDeleteButton)}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteAlertDialog;
