import { useState, useMemo } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  Typography,
} from "@mui/material";
import AccountLayout from "../layouts/account/AccountLayout";
import BudgetDrawer from "../components/budget/BudgetDrawer";
import { useDeleteBudgetMutation, useFetchBudgetsQuery } from "../api/budget";
import { Budget } from "../types/budget";
import SearchField from "../components/common/SearchField";
import { StyledTableRow } from "../components/common/StyledTableRow";
import { StyledTableCell } from "../components/common/StyledTableCell";
import BudgetRow from "../components/budget/BudgetRow";
import CustomPagination from "../components/common/CustomPagination";
import DeleteAlertDialog from "../components/DeleteAlertDialog";

const BudgetPage = () => {
  const [isDrawerOpened, setIsDrawerOpened] = useState(false);
  const [currentBudget, setCurrentBudget] = useState<Budget | undefined>(
    undefined
  );
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isDeleteDialogOpened, setIsDeleteDialogOpened] =
    useState<boolean>(false);
  const [budgetIdToDelete, setBudgetIdToDelete] = useState<string>("");

  const { data: budgets, isLoading, isFetching } = useFetchBudgetsQuery();
  const [deleteBudget] = useDeleteBudgetMutation();

  const handleDelete = (id: string) => {
    setBudgetIdToDelete(id);
    setIsDeleteDialogOpened(true);
  };

  const confirmDelete = async () => {
    await deleteBudget({ id: budgetIdToDelete });
    setIsDeleteDialogOpened(false);
  };

  // Filter budgets based on search text:
  const filteredBudgets = useMemo(() => {
    if (!budgets) return [];
    return budgets.filter((budget) =>
      `${budget.name} ${budget.watch?.[0]?.name || ""} ${budget.period}`
        .toLowerCase()
        .includes(searchText.toLowerCase())
    );
  }, [budgets, searchText]);

  // Paginate the filtered budgets:
  const paginatedBudgets = useMemo(() => {
    return filteredBudgets.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [filteredBudgets, page, rowsPerPage]);

  return (
    <AccountLayout
      leftPanel={null}
      broadcrumbs={["Home", "Budget"]}
      title="Budget Management"
      subTitle="Manage your budgets"
      drawer={{
        button: (
          <Button
            color="primary"
            size="small"
            variant="contained"
            sx={{ marginLeft: "auto" }}
            onClick={() => {
              setCurrentBudget(undefined);
              setIsDrawerOpened(true);
            }}
          >
            <Typography>CREATE BUDGET</Typography>
          </Button>
        ),
        drawerBody: isDrawerOpened ? (
          <BudgetDrawer
            isDrawerOpened={isDrawerOpened}
            setOpenDrawer={setIsDrawerOpened}
            onDrawerClose={() => {}}
            current={currentBudget}
          />
        ) : null,
      }}
    >
      <Box sx={{ marginTop: "16px", padding: "48px 32px" }}>
        <Paper sx={{ padding: "16px", borderRadius: "8px" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 2,
            }}
          >
            <SearchField
              value={searchText}
              onChange={setSearchText}
              placeholder="Search budgets..."
              debounceTime={300}
            />
          </Box>
          {isLoading || isFetching || !budgets ? (
            <CircularProgress />
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <StyledTableRow>
                      <StyledTableCell variantType="header">
                        Name
                      </StyledTableCell>
                      <StyledTableCell variantType="header">
                        App/LLM
                      </StyledTableCell>
                      <StyledTableCell variantType="header">
                        Period
                      </StyledTableCell>
                      <StyledTableCell variantType="header" align="right">
                        Budget Amount
                      </StyledTableCell>
                      <StyledTableCell variantType="header">
                        Action
                      </StyledTableCell>
                    </StyledTableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedBudgets.map((budget) => (
                      <BudgetRow
                        key={budget._id}
                        item={budget}
                        onEdit={(budget) => {
                          setCurrentBudget(budget);
                          setIsDrawerOpened(true);
                        }}
                        onDelete={handleDelete}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <CustomPagination
                count={filteredBudgets.length}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={(event, newPage) => setPage(newPage)}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setPage(0);
                }}
              />
            </>
          )}
          <DeleteAlertDialog
            dialogTitle="Are you sure you want to delete this budget?"
            handleDeleteButton={confirmDelete}
            isOpened={isDeleteDialogOpened}
            setIsOpened={setIsDeleteDialogOpened}
          />
        </Paper>
      </Box>
    </AccountLayout>
  );
};

export default BudgetPage;
