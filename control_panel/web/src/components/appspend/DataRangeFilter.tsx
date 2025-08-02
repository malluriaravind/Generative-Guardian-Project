import { Popover } from "@mui/material";
import { DateRangePicker, RangeKeyDict, Range } from "react-date-range";

type DateRangeFilterProps = {
  anchorEl: Element;
  setOpen: (value: boolean) => void;
  isOpen: boolean;
  ranges: Range[];
  setRanges: (ranges: Range[]) => void;
};
export default function DateRangeFilter({
  anchorEl,
  setOpen,
  isOpen,
  ranges,
  setRanges,
}: DateRangeFilterProps) {
  const onRangeChange = (item: RangeKeyDict) => {
    const range = item["selection"];
    range.endDate?.setHours(23, 59, 59);
    setRanges([range]);
  };
return (
    <Popover open={isOpen} onClose={() => setOpen(false)} anchorEl={anchorEl} sx={{
      marginTop: "2%",
    }}>
      <DateRangePicker
        onChange={onRangeChange}
        direction="horizontal"
        moveRangeOnFirstSelection={false}
        editableDateInputs={true}
        retainEndDateOnFirstSelection={true}
        ranges={ranges}
        weekStartsOn={1}
      />
    </Popover>
  );
}
