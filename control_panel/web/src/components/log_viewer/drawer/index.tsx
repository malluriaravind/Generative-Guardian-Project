import { Box, Button, Stack, SwipeableDrawer, Typography } from "@mui/material";
import { LogViewerDrawerType } from "../../../types/log_viewer";
import filterDrawerData from "./filters";
import settingsDrawerData from "./settings";
import weeklyDrawerData from "./weekly";
import CloseIcon from "@mui/icons-material/Close";
import { setAlert } from "../../../slices/alert";


type LogViewerDrawerProps = {
    drawerType: LogViewerDrawerType | null;
    onClose: () => void;
    onOpen: () => void;
};

const LogViewerDrawerContentMapper: { [key: LogViewerDrawerType]: ReactNode } = {
    'filter': filterDrawerData,
    'settings': settingsDrawerData,
    'weekly': weeklyDrawerData,
};

const LogViewerDrawer = (props: LogViewerDrawerProps) => {
    const { drawerType, onClose, onOpen } = props;
    if (drawerType === null) {
        return;
    }
    const drawerData = LogViewerDrawerContentMapper[drawerType];

    if(typeof drawerData === 'undefined') {
        dispatch(setAlert({
            shouldRender: true,
            title: '',
            type: 'warning',
            message: 'Drawer not working',
        }))
        return;
    }

    return <SwipeableDrawer
        anchor="right"
        open={drawerType !== null}
        onClose={onClose}
        onOpen={onOpen}
    >
        <Box
            display="flex"
            sx={{ backgroundColor: "#F5F5F5" }}
            padding={"24px"}
            flexDirection="column"
            height="100%"
            width="320px"
        >
        <Stack display="flex" flexDirection="row">
            <Typography fontSize="24px" fontStyle="normal" fontWeight="500">
                {drawerData.title}
            </Typography>
            <Button
                variant="grayed"
                style={{ marginLeft: "auto" }}
                onClick={onClose}
            >
            <CloseIcon />
            </Button>
        </Stack>
        <drawerData.component onClick={onClose} />
        </Box>
        </SwipeableDrawer>;
};

export default LogViewerDrawer;