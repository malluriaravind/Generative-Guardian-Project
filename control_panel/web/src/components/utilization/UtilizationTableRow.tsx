import { useState } from "react";
import {
  TableCell,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  LinearProgress,
  IconButton,
  Box,
  Button,
  TextField,
} from "@mui/material";
import { Stats } from "../../types/stats";

import { useAppSelector } from "../../store";
import { useGetUtilizationModelStatsQuery } from "../../api/utilizationstats";
import { RiCloseCircleLine } from "react-icons/ri";

type UtilizationTableRowProps = {
  item: Stats;
};
const UtilizationTableRow = ({ item }: UtilizationTableRowProps) => {
  const [isPanelOpened, setOpenPanel] = useState<boolean>(false);
  const [isActive, setActive] = useState(false);
  const togglePanel = () => {
    setOpenPanel(!isPanelOpened);
    setActive(!isActive);
  };
  const handleClose = () => {
    setOpenPanel(false);
    setActive(false);
  };
  const { dateRange } = useAppSelector((state) => state.filter);
  const { data, isLoading } = useGetUtilizationModelStatsQuery(
    {
      begin: dateRange?.startDate ?? null,
      end: dateRange?.endDate ?? null,
    },
    { refetchOnMountOrArgChange: true }
  );

  if (isLoading || !data) {
    return <LinearProgress color="primary" />;
  }

  return (
    <>
      <TableRow
        sx={{
          backgroundColor: isActive ? "#d5dfed" : "inherit",
          "&:hover": {
            backgroundColor: "#f0f0f0",
            cursor: "pointer",
          },
        }}
        onClick={togglePanel}
      >
        <TableCell
          sx={{
            padding: "7px",
            height: "2vh",
            width: "10vw",
          }}
        >
          {new Date(item.timestamp).toLocaleString()}
        </TableCell>
        <TableCell
          sx={{
            padding: "4px",
          }}
          align="center"
        >
          {item.error && item.error.type ? (
            <Typography textAlign={"start"} fontSize="14px">
              {item.error.type}
            </Typography>
          ) : null}
        </TableCell>
        <TableCell
          sx={{
            padding: "4px 4px 4px 40px",
          }}
          align="left"
        >
          <strong>{item.error?.http_code}</strong>{" "}
          {item.error?.message.replace(/['"{}\[\]]/g, "")}
        </TableCell>
      </TableRow>
      <Dialog
        open={isPanelOpened}
        onClose={handleClose}
        fullWidth
        maxWidth="lg"
        sx={{ height: "80vh" }}
      >
        <DialogTitle>Event Details</DialogTitle>
        <DialogContent>
          <DialogContentText alignItems={"center"}>
            <Typography variant="body1" color="black">
              Category: {item.error?.type}
            </Typography>
            <Typography variant="body1" color="black">
              Date: {new Date(item.timestamp).toLocaleString()}
            </Typography>
            <Typography variant="body1" color="black">
              Response: <strong>{item.error?.http_code}</strong>{" "}
              {item.error?.message.replace(/['"{}\[\]]/g, "")}
            </Typography>
          </DialogContentText>
          <TextField
            sx={{
              fontFamily: "monospace !important",
            }}
            fullWidth
            multiline
            rows={15}
            value={JSON.stringify(item.request_body, null, 4)}
            InputProps={{
              readOnly: true,
              style: { fontFamily: "monospace" },
            }}
          ></TextField>

          <Box
            display="flex"
            justifyContent="end"
            p="8px"
            onClick={handleClose}
          >
            <Button color="primary" variant="contained">
              Close
            </Button>
          </Box>
        </DialogContent>
        <IconButton
          sx={{ position: "absolute", top: 10, right: 10 }}
          onClick={handleClose}
        >
          <RiCloseCircleLine />
        </IconButton>
      </Dialog>
    </>
  );
};

export default UtilizationTableRow;
