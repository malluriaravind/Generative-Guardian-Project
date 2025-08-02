import React from "react";
import {
  TableHead,
  TableRow,
  TableSortLabel,
} from "@mui/material";
import { HeadCell, headCells } from "./headCells";
import { StyledTableCell } from "../common/StyledTableCell";
import { Budget } from "../../types/budget";

type BudgetTableHeaderProps = {
  order: "asc" | "desc";
  orderBy: keyof Budget;
  onRequestSort: (property: keyof Budget) => void;
};

const BudgetTableHeader: React.FC<BudgetTableHeaderProps> = ({
  order,
  orderBy,
  onRequestSort,
}) => {
  const createSortHandler = (property: keyof Budget) => () => {
    onRequestSort(property);
  };

  return (
    <TableHead>
      <TableRow>
        {headCells.map((headCell) => (
          <StyledTableCell
            key={headCell.id}
            align={headCell.numeric ? "right" : "left"}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            {headCell.sortable ? (
              <TableSortLabel
                active={orderBy === headCell.id}
                direction={orderBy === headCell.id ? order : "asc"}
                onClick={createSortHandler(headCell.id as keyof Budget)}
              >
                {headCell.label}
              </TableSortLabel>
            ) : (
              headCell.label
            )}
          </StyledTableCell>
        ))}
      </TableRow>
    </TableHead>
  );
};

export default BudgetTableHeader;