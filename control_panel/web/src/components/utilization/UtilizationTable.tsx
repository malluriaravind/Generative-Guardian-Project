import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableSortLabel,
  TableRow,
  styled,
} from "@mui/material";
import UtilizationTableRow from "./UtilizationTableRow";
import { Stats } from "../../types/stats";

const BoldTableCell = styled(TableCell)({
  fontWeight: "bold",
  padding: "4px  4px  5px  20px",
});

type Order = "asc" | "desc";
type UtilizationTableProps = {
  items: Stats[] | undefined;
};

const UtilizationTable = ({ items }: UtilizationTableProps) => {
  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<string>("date");

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedItems = Array.isArray(items) ? [...items] : [];
  sortedItems.sort((a, b) => {
    const isAsc = order === "asc";
    const aValue = a[orderBy];
    const bValue = b[orderBy];
    if (aValue == null) return isAsc ? -1 : 1;
    if (bValue == null) return isAsc ? 1 : -1;
    if (typeof aValue === "string" && typeof bValue === "string") {
      return isAsc
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
      return isAsc
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue);
    }
    return 0;
  });

  return (
    <TableContainer>
      <Table aria-label="simple table">
        <TableHead>
          <TableRow>
            <BoldTableCell>
              <TableSortLabel
                active={orderBy === "date"}
                direction={order}
                onClick={() => handleRequestSort("date")}
              >
                Date
              </TableSortLabel>
            </BoldTableCell>
            <BoldTableCell align="left">
              <TableSortLabel
                active={orderBy === "category"}
                direction={order}
                onClick={() => handleRequestSort("category")}
              >
                Category
              </TableSortLabel>
            </BoldTableCell>
            <BoldTableCell align="center">
              <TableSortLabel
                active={orderBy === "details"}
                direction={order}
                onClick={() => handleRequestSort("details")}
              >
                Details
              </TableSortLabel>
            </BoldTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedItems.map((item) => (
            <UtilizationTableRow key={item._id} item={item} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default UtilizationTable;
