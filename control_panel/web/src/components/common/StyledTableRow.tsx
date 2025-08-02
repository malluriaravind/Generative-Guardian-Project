import { styled } from "@mui/material/styles";
import TableRow from "@mui/material/TableRow";

interface StyledTableRowProps {
  clickable?: boolean;
  selected?: boolean;
}

export const StyledTableRow = styled(TableRow, {
  shouldForwardProp: (prop) => prop !== "clickable" && prop !== "selected",
})<StyledTableRowProps>(({ theme, clickable, selected }) => ({
  backgroundColor: selected ? theme.palette.action.selected : theme.palette.common.white,
  cursor: clickable ? "pointer" : "default",
  transition: "background-color 0.3s, box-shadow 0.3s",
  "&:nth-of-type(even)": {
    backgroundColor: selected ? theme.palette.action.selected : theme.palette.grey[50],
  },
  "&:hover": clickable
    ? {
        backgroundColor: theme.palette.action.hover,
        boxShadow: theme.shadows[2],
      }
    : {},
})); 