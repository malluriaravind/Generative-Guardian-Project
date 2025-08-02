import React from "react";
import { TablePagination } from "@mui/material";

type CustomPaginationProps = {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

const CustomPagination: React.FC<CustomPaginationProps> = ({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) => {
  return (
    <TablePagination
      component="div"
      count={count}
      page={page}
      onPageChange={onPageChange}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={onRowsPerPageChange}
      rowsPerPageOptions={[5, 10, 25]}
      sx={{
        "& .MuiTablePagination-root": {
          backgroundColor: "#f5f5f5",
        },
        "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
          color: "#000000",
        },
        "& .MuiTablePagination-select": {
          color: "#000000",
        },
      }}
    />
  );
};

export default CustomPagination; 