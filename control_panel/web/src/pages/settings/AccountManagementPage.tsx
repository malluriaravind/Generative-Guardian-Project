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
  TableSortLabel,
} from "@mui/material";
import AccountLayout from "../../layouts/account/AccountLayout";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AccountUpdateDrawer from "../../components/settings/account_management/AccountUpdateDrawer";
import AccountCreateDrawer from "../../components/settings/account_management/AccountCreateDrawer";
import { useFetchAccountsQuery, useDeleteAccountMutation } from "../../api/user";
import { Account } from "../../types/account";
import DeleteAlertDialog from "../../components/DeleteAlertDialog";
import SearchField from "../../components/common/SearchField";
import AccountActionButton from "../../components/common/AccountActionButton";
import { StyledTableRow } from "../../components/common/StyledTableRow";
import { StyledTableCell } from "../../components/common/StyledTableCell";
import CustomPagination from "../../components/common/CustomPagination";
import useSortableData from "../../hooks/useSortableData";

const AccountManagementPage = () => {
  // Drawer states:
  const [isCreateDrawerOpened, setIsCreateDrawerOpen] = useState(false);
  const [isUpdateDrawerOpened, setIsUpdateDrawerOpen] = useState(false);
  // Delete dialog and row selection:
  const [isDeleteDialogOpened, setIsDeleteDialogOpened] = useState(false);
  const [selectedRow, setSelectedRow] = useState<Account | null>(null);

  // Search and pagination states:
  const [searchText, setSearchText] = useState<string >("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  const { data, isLoading, isFetching, refetch } = useFetchAccountsQuery();
  const [deleteAccount] = useDeleteAccountMutation();

  // Filter accounts based on search text:
  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((account) =>
      `${account.first_name} ${account.last_name} ${account.email}`
        .toLowerCase()
        .includes(searchText.toLowerCase())
    );
  }, [data, searchText]);

  // Use centralized sorting hook with default sort by "first_name" in ascending order.
  const { sortedItems, requestSort, sortConfig } = useSortableData(filteredData, {
    key: "first_name",
    direction: "asc",
  });

  // Paginate sorted data:
  const paginatedData = useMemo(
    () =>
      sortedItems.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [sortedItems, page, rowsPerPage]
  );

  const handleDelete = async () => {
    if (!selectedRow?.email) return;
    await deleteAccount({ email: selectedRow.email });
    refetch();
  };

  // Button to trigger the create drawer (placed in the layout header):
  const DrawerButton = () => (
    <Button
      color="primary"
      size="small"
      variant="contained"
      sx={{ marginLeft: "auto" }}
      onClick={() => setIsCreateDrawerOpen(true)}
    >
      <Typography>CREATE USER</Typography>
    </Button>
  );

  return (
    <AccountLayout
      leftPanel={null}
      broadcrumbs={["Home", "Settings", "Manage Accounts"]}
      subTitle="Add/delete users"
      title="Account Management"
      drawer={{
        button: <DrawerButton />,
        drawerBody:
          isUpdateDrawerOpened && selectedRow ? (
            <AccountUpdateDrawer
              isDrawerOpened={isUpdateDrawerOpened}
              setIsDrawerOpen={setIsUpdateDrawerOpen}
              account={selectedRow}
            />
          ) : (
            <AccountCreateDrawer
              isDrawerOpened={isCreateDrawerOpened}
              setIsDrawerOpen={setIsCreateDrawerOpen}
            />
          ),
      }}
    >
      <Box sx={{ marginTop: "16px", padding: "48px 32px" }}>
        <Paper sx={{ padding: "16px", borderRadius: "8px" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <SearchField
              value={searchText}
              onChange={setSearchText}
              placeholder="Search account..."
              debounceTime={300}
            />
          </Box>
          {isLoading || isFetching || !data ? (
            <CircularProgress />
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <StyledTableRow>
                      <StyledTableCell variantType="header">
                        <TableSortLabel
                          active={sortConfig.key === "first_name"}
                          direction={sortConfig.key === "first_name" ? sortConfig.direction : "asc"}
                          onClick={() => requestSort("first_name")}
                        >
                          First Name
                        </TableSortLabel>
                      </StyledTableCell>
                      <StyledTableCell variantType="header">
                        <TableSortLabel
                          active={sortConfig.key === "last_name"}
                          direction={sortConfig.key === "last_name" ? sortConfig.direction : "asc"}
                          onClick={() => requestSort("last_name")}
                        >
                          Last Name
                        </TableSortLabel>
                      </StyledTableCell>
                      <StyledTableCell variantType="header">
                        <TableSortLabel
                          active={sortConfig.key === "email"}
                          direction={sortConfig.key === "email" ? sortConfig.direction : "asc"}
                          onClick={() => requestSort("email")}
                        >
                          Email
                        </TableSortLabel>
                      </StyledTableCell>
                      <StyledTableCell variantType="header">
                        <TableSortLabel
                          active={sortConfig.key === "created_at"}
                          direction={sortConfig.key === "created_at" ? sortConfig.direction : "asc"}
                          onClick={() => requestSort("created_at")}
                        >
                          Created On
                        </TableSortLabel>
                      </StyledTableCell>
                      <StyledTableCell variantType="header">Action</StyledTableCell>
                    </StyledTableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedData.map((account) => (
                      <StyledTableRow key={account.email} clickable>
                        <StyledTableCell>{account.first_name}</StyledTableCell>
                        <StyledTableCell>{account.last_name}</StyledTableCell>
                        <StyledTableCell>{account.email}</StyledTableCell>
                        <StyledTableCell>{account.created_at}</StyledTableCell>
                        <StyledTableCell>
                          <AccountActionButton
                            tooltip="Edit User"
                            icon={<EditOutlinedIcon color="primary" />}
                            onClick={() => {
                              setSelectedRow(account);
                              setIsUpdateDrawerOpen(true);
                            }}
                            variant="default"
                          />
                          <AccountActionButton
                            tooltip="Delete User"
                            icon={<DeleteOutlineOutlinedIcon color="error" />}
                            onClick={() => {
                              setSelectedRow(account);
                              setIsDeleteDialogOpened(true);
                            }}
                            variant="default"
                          />
                        </StyledTableCell>
                      </StyledTableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <CustomPagination
                count={sortedItems.length}
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
        </Paper>
      </Box>
      <DeleteAlertDialog
        dialogTitle="Are you sure you want to delete this user?"
        handleDeleteButton={handleDelete}
        isOpened={isDeleteDialogOpened}
        setIsOpened={setIsDeleteDialogOpened}
      />
    </AccountLayout>
  );
};

export default AccountManagementPage;
