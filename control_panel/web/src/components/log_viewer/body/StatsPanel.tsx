import { Box, Stack, Typography } from "@mui/material";
import { useAppSelector } from "../../../store";
import { useGetStatsCountQuery } from "../../../api/log_viewer";

const StatsItem = ({text}: {text: string}) => {
    return <Box border='1px solid #9FB593' bgcolor='#E7F4E0' p='4px' borderRadius='4px'>
        <Typography fontWeight='bold'>{text}</Typography>
    </Box>
};

const StatsPanel = () => {
    const filters = useAppSelector(state => state.logViewer.filter);
    const {data: prompts = 0 } = useGetStatsCountQuery({ type: "prompt", ...filters}, {refetchOnMountOrArgChange: true});
    const {data: apps = 0 } = useGetStatsCountQuery({ type: "app", ...filters}, {refetchOnMountOrArgChange: true});
    const {data: users = 0 } = useGetStatsCountQuery({ type: "dev", ...filters}, {refetchOnMountOrArgChange: true});
    const logFilters = useAppSelector(state => state.logViewer.filter);
    if(!logFilters.prompts && !logFilters.responses) {
        return;
    }
    return <Stack borderBottom='1px solid gray' direction='row' gap="8px" pb='10px'>
        <StatsItem text={`Prompts: ${prompts}`} />
        <StatsItem text={`Applications: ${apps}`} />
        <StatsItem text={`Users: ${users}`} />
    </Stack>;
};

export default StatsPanel;
