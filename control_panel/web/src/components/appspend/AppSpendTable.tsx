import React, { useState } from "react";
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
import AppSpendTableRow from "./AppSpendTableRow";
import { Stats, StatsType } from "../../types/stats";

const BoldTableCell = styled(TableCell)({
  fontWeight: "bold",
  padding: "4px  4px  5px  20px",
});
type Order = "asc" | "desc";
type AppSpendTableProps = {
  items: Stats[];
  type: StatsType;
};
const AppSpendTable = ({ items, type }: AppSpendTableProps) => {
  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<string>("name");
  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };
  const sortedItems = [...items].sort((a, b) => {
    const isAsc = order === "asc";
    const aValue = a[orderBy];
    const bValue = b[orderBy];
    if (typeof aValue === "string" && typeof bValue === "string") {
      return isAsc
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    return isAsc ? aValue - bValue : bValue - aValue;
  });
  return (
    <TableContainer>
      <Table aria-label="simple table">
        <TableHead>
          <TableRow>
            <BoldTableCell>
              <TableSortLabel
                active={orderBy === "name"}
                direction={order}
                onClick={() => handleRequestSort("name")}
              >
                Name
              </TableSortLabel>
            </BoldTableCell>
            <BoldTableCell align="center">
              <TableSortLabel
                active={orderBy === "tokensUsed"}
                direction={order}
                onClick={() => handleRequestSort("tokensUsed")}
              >
                Tokens Used
              </TableSortLabel>
            </BoldTableCell>
            <BoldTableCell align="center">
              <TableSortLabel
                active={orderBy === "total"}
                direction={order}
                onClick={() => handleRequestSort("total")}
              >
                Total
              </TableSortLabel>
            </BoldTableCell>
            <BoldTableCell align="center">
              <TableSortLabel
                active={orderBy === "costTrend"}
                direction={order}
                onClick={() => handleRequestSort("costTrend")}
              >
                Cost Trend
              </TableSortLabel>
            </BoldTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedItems.map((item) => (
            <AppSpendTableRow key={item._id} item={item} type={type} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AppSpendTable;
