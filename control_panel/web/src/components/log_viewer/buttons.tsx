import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Button, Stack } from "@mui/material";
import DateRangeFilter from "../appspend/DataRangeFilter";
import { Range } from "react-date-range";
import FolderIcon from '@mui/icons-material/Folder';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { LogViewerDrawerType } from "../../types/log_viewer";
import { useAppDispatch } from "../../store";
import { setFilter } from "../../slices/log_viewer";

type DrawerButtonsProps = {
    setDrawerType: Dispatch<SetStateAction<LogViewerDrawerType | null>>;
};

const DrawerButtons = ({setDrawerType}: DrawerButtonsProps) => {
    const dispatch = useAppDispatch();
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const today = new Date();
    const [ranges, setRanges] = useState<Range[]>([
        {
          startDate: new Date(today.getFullYear(), today.getMonth(), 1),
          endDate: new Date(today.getFullYear(), today.getMonth() + 1, 1),
          key: "selection",
        },
      ]);
    useEffect(() => {
        dispatch(setFilter({begin: ranges[0].startDate?.toISOString(),  end: ranges[0].endDate?.toISOString(), endDate: undefined }));
    }, [ranges]);
    return <Stack ml="auto" direction='row' spacing={2}>
        <Button color="primary" variant="outlined" onClick={(ev) => setAnchorEl(ev.currentTarget)}>
            <CalendarTodayIcon />
            {ranges[0].startDate?.toDateString()}  - {ranges[0].endDate?.toDateString()}
        </Button>
        <Button
            color="primary"
            size="small"
            variant="outlined"
            onClick={() => setDrawerType('weekly')}
            startIcon={<FolderIcon />}
        >
            COMPLIANCE REPORT
        </Button>
        <DateRangeFilter
            isOpen={Boolean(anchorEl)}
            setOpen={() => setAnchorEl(null)}
            ranges={ranges}
            setRanges={(ranges: Range[]) => {
                setRanges(ranges);
                dispatch(setFilter({begin: ranges[0].startDate?.toISOString(), end: ranges[0].endDate?.toISOString()}))
            }}
            anchorEl={anchorEl!}
        />
    </Stack>
};

export default DrawerButtons;