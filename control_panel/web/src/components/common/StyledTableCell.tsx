import { TableCell, styled } from "@mui/material";

export interface StyledTableCellProps {
  variantType?: "header" | "body";
}

export const StyledTableCell = styled(TableCell, {
  shouldForwardProp: (prop) => prop !== "variantType",
})<StyledTableCellProps>(({ theme, variantType }) => ({
  backgroundColor:
    variantType === "header"
      ? theme.palette.primary.main
      : theme.palette.common.white,
  color:
    variantType === "header"
      ? theme.palette.common.white
      : theme.palette.text.primary,
  borderBottom:
    variantType === "header"
      ? `2px solid ${theme.palette.divider}`
      : `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1),
  "& .MuiTableSortLabel-root": {
    color: theme.palette.common.white,
    "&.Mui-active": {
      color: theme.palette.common.white,
    },
    "& .MuiTableSortLabel-icon": {
      color: theme.palette.common.white,
    },
  },
}));
