import React from "react";
import { TableBody, TableCell, Box } from "@mui/material";
import { headCells } from "./headCells";
import { Budget } from "../../types/budget";
import BudgetRow from "./BudgetRow";
import { StyledTableRow } from "../common/StyledTableRow";

type BudgetTableBodyProps = {
  isLoading: boolean;
  isError: boolean;
  data: Budget[];
  rowsPerPage: number;
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
};

const BudgetTableBody: React.FC<BudgetTableBodyProps> = ({
  isLoading,
  isError,
  data,
  rowsPerPage,
  onEdit,
  onDelete,
}) => {
  return (
    <TableBody>
      {isLoading ? (
        // Render loading skeletons
        Array.from(new Array(rowsPerPage || 10)).map((_, index) => (
          <StyledTableRow key={index}>
            {headCells.map((cell) => (
              <TableCell key={cell.id}>
                <Box
                  width="100%"
                  height="20px"
                  bgcolor="#f0f0f0" // You might replace this with a color constant from colors.ts
                  borderRadius={1}
                />
              </TableCell>
            ))}
          </StyledTableRow>
        ))
      ) : isError ? (
        // Render error message row
        <StyledTableRow>
          <TableCell colSpan={headCells.length} align="center">
            An error occurred while fetching budgets.
          </TableCell>
        </StyledTableRow>
      ) : data.length > 0 ? (
        // Render data rows
        data.map((item) => (
          <BudgetRow
            key={item._id}
            item={item}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      ) : (
        // Render empty state
        <StyledTableRow>
          <TableCell colSpan={headCells.length} align="center">
            No budgets found.
          </TableCell>
        </StyledTableRow>
      )}
    </TableBody>
  );
};

export default BudgetTableBody; 