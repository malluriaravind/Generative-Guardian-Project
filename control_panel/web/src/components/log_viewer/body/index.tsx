import { Box } from "@mui/material";
import LogViewerFilterPanel from "./FilterPanel";
import StatsPanel from "./StatsPanel";
import LogViewerTable from "./LogViewerTable";


const LogViewerBody = () => {

  return <Box sx={{marginTop: "16px"}}>
    <StatsPanel />
    <LogViewerFilterPanel />
    <LogViewerTable />
  </Box>;
};

export default LogViewerBody;