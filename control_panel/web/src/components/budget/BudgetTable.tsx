import React, { useMemo, useState } from "react";
import {
  Box,
  IconButton,
  Table,
  TableCell,
  TableContainer,
  TableRow,
  TableBody,
  TablePagination,
  styled,
  Tooltip,
  useTheme,
  Paper,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { Budget } from "../../types/budget";
import {
  useDeleteBudgetMutation,
  useFetchBudgetsQuery,
} from "../../api/budget";
import DeleteAlertDialog from "../DeleteAlertDialog";
import { useEffect } from "react";
import SearchField from "../common/SearchField";
import BudgetTableHeader from "./BudgetTableHeader";

type BudgetItemProps = {
  item: Budget;
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
};

interface HeadCell {
  id: keyof Budget | "actions";
  label: string;
  numeric: boolean;
}

const headCells: HeadCell[] = [
  { id: "name", label: "Name", numeric: false },
  { id: "watch", label: "App / LLM", numeric: false },
  { id: "period", label: "Period", numeric: false },
  { id: "budget", label: "Budget Amount", numeric: true },
  { id: "actions", label: "Actions", numeric: false },
];

type Order = "asc" | "desc";

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: "#ffffff", // White background for all rows
  cursor: "pointer",
  transition: "background-color 0.3s",
  "&:nth-of-type(even)": {
    backgroundColor: "#f9f9f9", // Light grey background for even rows
  },
  "&:hover": {
    backgroundColor: "#e3f2fd", // Slight blue on hover
  },
}));

const BudgetRow = ({ item, onEdit, onDelete }: BudgetItemProps) => {
  const theme = useTheme();
  const { name, watch, period, budget, _id } = item;
  return (
    <StyledTableRow>
      <TableCell
        component="th"
        scope="row"
        sx={{ color: theme.palette.text.primary, fontWeight: "500" }}
      >
        {name}
      </TableCell>
      <TableCell sx={{ color: theme.palette.text.secondary }}>
        {watch[0]?.name || "N/A"}
      </TableCell>
      <TableCell sx={{ color: theme.palette.text.secondary }}>
        {period}
      </TableCell>
      <TableCell
        align="right"
        sx={{ color: theme.palette.text.primary, fontWeight: "500" }}
      >
        ${budget.toLocaleString()}
      </TableCell>
      <TableCell>
        <Tooltip title="Edit Budget" arrow>
          <IconButton
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            sx={{
              transition: "transform 0.2s",
              "&:hover": { transform: "scale(1.2)" },
            }}
          >
            <EditOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete Budget" arrow>
          <IconButton
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(_id);
            }}
            sx={{
              transition: "transform 0.2s",
              "&:hover": { transform: "scale(1.2)" },
            }}
          >
            <DeleteOutlineOutlinedIcon />
          </IconButton>
        </Tooltip>
      </TableCell>
    </StyledTableRow>
  );
};

type BudgetTableProps = {
  setOpenDrawer: (value: boolean) => void;
  setCurrentBudget: (value: Budget) => void;
  showAddButton?: boolean; // Prop to control Add Budget button visibility
};

const BudgetTable = ({
  setOpenDrawer,
  setCurrentBudget,
  showAddButton = true,
}: BudgetTableProps) => {
  const theme = useTheme();
  const { data, isLoading, isError } = useFetchBudgetsQuery();
  const [deleteBudget] = useDeleteBudgetMutation();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<keyof Budget>("name");
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [isDeleteDialogOpened, setIsDeleteDialogOpened] =
    useState<boolean>(false);
  const [budgetIdToDelete, setBudgetIdToDelete] = useState<string>("");

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(0);
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(
      (budget) =>
        budget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        budget.watch[0]?.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        budget.period.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  const sortedData = useMemo(() => {
    return filteredData.slice().sort((a, b) => {
      let aValue: any = a[orderBy];
      let bValue: any = b[orderBy];

      // Handle nested fields if necessary
      if (orderBy === "watch") {
        aValue = a.watch[0]?.name || "";
        bValue = b.watch[0]?.name || "";
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return order === "asc" ? aValue - bValue : bValue - aValue;
      }

      return order === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [filteredData, order, orderBy]);

  const paginatedData = useMemo(() => {
    return sortedData.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [sortedData, page, rowsPerPage]);

  useEffect(() => {
    if (page > 0 && paginatedData.length === 0) {
      setPage(0);
    }
  }, [paginatedData.length]);

  const handleRequestSort = (property: keyof Budget) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleEdit = (budget: Budget) => {
    setCurrentBudget(budget);
    setOpenDrawer(true);
  };

  const handleDelete = (id: string) => {
    setBudgetIdToDelete(id);
    setIsDeleteDialogOpened(true);
  };

  const confirmDelete = async () => {
    await deleteBudget({ id: budgetIdToDelete });
    setIsDeleteDialogOpened(false);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Paper
      sx={{
        backgroundColor: "#ffffff", // Single white background for the entire table
        borderRadius: 2,
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
        padding: "16px",
      }}
    >
      <Box display="flex" justifyContent="space-between" mb={2}>
        {showAddButton && (
          <IconButton color="primary" onClick={() => setOpenDrawer(true)}>
            ADD BUDGET
          </IconButton>
        )}
        <Box sx={{ width: "100%", maxWidth: "400px" }}>
          <SearchField
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search Budgets"
            debounceTime={300}
          />
        </Box>
      </Box>
      <TableContainer>
        <Table stickyHeader>
          <BudgetTableHeader
            order={order}
            orderBy={orderBy}
            onRequestSort={handleRequestSort}
          />
          <TableBody>
            {isLoading ? (
              Array.from(new Array(rowsPerPage)).map((_, index) => (
                <TableRow key={index}>
                  {headCells.map((cell) => (
                    <TableCell key={cell.id}>
                      <Box
                        width="100%"
                        height="20px"
                        bgcolor={theme.palette.action.hover}
                        borderRadius={1}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={headCells.length} align="center">
                  An error occurred while fetching budgets.
                </TableCell>
              </TableRow>
            ) : paginatedData.length > 0 ? (
              paginatedData.map((item) => (
                <BudgetRow
                  key={item._id}
                  item={item}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={headCells.length} align="center">
                  No budgets found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={sortedData.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[
          5,
          10,
          25,
          50,
          { label: "All", value: sortedData.length },
        ]}
        labelRowsPerPage="Rows per page:"
        sx={{
          "& .MuiTablePagination-toolbar": {
            backgroundColor: "#ffffff", // White background for pagination
            boxShadow: "0 -1px 3px rgba(0, 0, 0, 0.1)",
            borderTop: `1px solid ${theme.palette.divider}`,
          },
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
            {
              color: theme.palette.text.primary,
            },
          "& .MuiTablePagination-select": {
            color: theme.palette.text.primary,
          },
        }}
      />
      <DeleteAlertDialog
        dialogTitle="Are you sure you want to delete this budget?"
        handleDeleteButton={confirmDelete}
        isOpened={isDeleteDialogOpened}
        setIsOpened={setIsDeleteDialogOpened}
      />
    </Paper>
  );
};

export default BudgetTable;
