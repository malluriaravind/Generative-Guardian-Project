import { Alert, Box, Button, Dialog, Stack, Typography } from "@mui/material";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import { setAlert } from "../../../slices/alert";
import { useAppDispatch } from "../../../store";

type ApiKeyDialogProps = {
  open: boolean;
  apiKey: string;
  onHandleClose: () => void;
};

const ApiKeyDialog = ({ open, apiKey, onHandleClose }: ApiKeyDialogProps) => {
  const dispatch = useAppDispatch();

  const copyApiKey = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(apiKey);
      dispatch(
        setAlert({
          type: "success",
          message: "Api key copied to clipboard",
          shouldRender: true,
          title: "",
        })
      );
    }
  };
  return (
    <Dialog open={open} onClose={onHandleClose} fullWidth>
      <Box p="16px 24px 20px 24px" display="flex" flexDirection="column">
        <Box paddingBottom="16px">
          <Typography
            fontSize="20px"
            fontWeight="500"
            sx={{ wordBreak: "break-all" }}
          >
            API Key
          </Typography>
        </Box>
        <Box
          p="8px 16px"
          sx={{
            border: "1px dashed #9747FF;",
            background: "rgba(151, 71, 255, 0.04);",
            borderRadius: "4px",
          }}
        >
        <Typography fontSize="14px" fontWeight="400" color="#424242" sx={{wordWrap: 'break-word'}}>
          {apiKey}
        </Typography>
        </Box>
        <Box paddingTop="8px" display="flex" flexDirection="row">
          <Alert severity="error">
            This message will be displayed only once, copy the key now.
          </Alert>
          {navigator.clipboard && (
            <Button onClick={copyApiKey}>
              <ContentCopyOutlinedIcon />
            </Button>
          )}
        </Box>
        <Box paddingTop="4px">
          {!window.isSecureContext ? (
            <Alert severity="warning">
              Copy button doesn't work on http. Please copy code manually.
            </Alert>
          ) : null}
        </Box>
      </Box>
    </Dialog>
  );
};

export default ApiKeyDialog;
