import { useState, useMemo } from "react";
import {
  Box,
  Button,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableSortLabel,
  Typography,
} from "@mui/material";
// import LeftDrawer from "../../components/settings/common/LeftDrawer";
import AccountLayout from "../../layouts/account/AccountLayout";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { useGetPoliciesQuery, useDeletePolicyMutation } from "../../api/policy";
import DeleteAlertDialog from "../../components/DeleteAlertDialog";
import SearchField from "../../components/common/SearchField";
import { StyledTableRow } from "../../components/common/StyledTableRow";
import { StyledTableCell } from "../../components/common/StyledTableCell";
import CustomPagination from "../../components/common/CustomPagination";
import useSortableData from "../../hooks/useSortableData";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../store";
import { reset } from "../../slices/policy";

const PolicyPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Fetch policies and reset slice state
  const {
    data: policies,
    isLoading,
    isFetching,
    refetch,
  } = useGetPoliciesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  dispatch(reset());
  const [deletePolicy] = useDeletePolicyMutation();

  // Local state for search, pagination and deletion
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isDeleteDialogOpened, setIsDeleteDialogOpened] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null); // Use your Policy type if available

  // Filter policies based on search text (searching in name, controls, apps)
  const filteredPolicies = useMemo(() => {
    if (!policies) return [];
    return policies.filter((policy: any) => {
      const searchStr =
        `${policy.name} ${policy.controls} ${policy.apps}`.toLowerCase();
      return searchStr.includes(searchText.toLowerCase());
    });
  }, [policies, searchText]);

  // Use centralized sorting hook with default sort by "name" ascending
  const { sortedItems, requestSort, sortConfig } = useSortableData(
    filteredPolicies,
    {
      key: "name",
      direction: "asc",
    }
  );

  // Paginate sorted data
  const paginatedPolicies = useMemo(() => {
    return sortedItems.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [sortedItems, page, rowsPerPage]);

  // Delete handler: delete the selected policy and refetch data
  const handleDelete = async () => {
    if (selectedPolicy) {
      await deletePolicy({ id: selectedPolicy._id });
      setIsDeleteDialogOpened(false);
      refetch();
    }
  };

  return (
    <AccountLayout
      broadcrumbs={["Home", "Policies"]}
      title="Policies"
      subTitle=""
      drawer={{
        button: (
          <Button
            color="primary"
            size="small"
            variant="contained"
            sx={{ marginLeft: "auto" }}
            onClick={() => navigate("/policies/manage")}
          >
            <Typography>ADD POLICY</Typography>
          </Button>
        ),
        drawerBody: null,
      }}
      leftPanel={null}
    >
      <Box
        sx={{
          marginTop: "16px",
          padding: "48px 32px",
          backgroundColor: "white",
          borderRadius: "8px",
        }}
      >
        {isLoading || isFetching || !policies ? (
          <LinearProgress color="primary" />
        ) : (
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
                placeholder="Search policies..."
                debounceTime={300}
              />
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <StyledTableRow>
                    <StyledTableCell variantType="header">
                      <TableSortLabel
                        active={sortConfig.key === "name"}
                        direction={
                          sortConfig.key === "name"
                            ? sortConfig.direction
                            : "asc"
                        }
                        onClick={() => requestSort("name")}
                      >
                        Policy Name
                      </TableSortLabel>
                    </StyledTableCell>
                    <StyledTableCell variantType="header">
                      <TableSortLabel
                        active={sortConfig.key === "controls"}
                        direction={
                          sortConfig.key === "controls"
                            ? sortConfig.direction
                            : "asc"
                        }
                        onClick={() => requestSort("controls")}
                      >
                        Controls
                      </TableSortLabel>
                    </StyledTableCell>
                    <StyledTableCell variantType="header">
                      <TableSortLabel
                        active={sortConfig.key === "apps"}
                        direction={
                          sortConfig.key === "apps"
                            ? sortConfig.direction
                            : "asc"
                        }
                        onClick={() => requestSort("apps")}
                      >
                        Applications
                      </TableSortLabel>
                    </StyledTableCell>
                    <StyledTableCell variantType="header">
                      Action
                    </StyledTableCell>
                  </StyledTableRow>
                </TableHead>
                <TableBody>
                  {paginatedPolicies.map((policy: any) => (
                    <StyledTableRow key={policy._id}>
                      <StyledTableCell>{policy.name}</StyledTableCell>
                      <StyledTableCell>
                        {policy.controls && Array.isArray(policy.controls)
                          ? policy.controls.join(", ")
                          : policy.controls}
                      </StyledTableCell>
                      <StyledTableCell>{policy.apps}</StyledTableCell>
                      <StyledTableCell>
                        <Button
                          onClick={() =>
                            navigate(`/policies/manage/${policy._id}`)
                          }
                          variant="text"
                        >
                          <EditOutlinedIcon color="primary" />
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedPolicy(policy);
                            setIsDeleteDialogOpened(true);
                          }}
                          variant="text"
                        >
                          <DeleteOutlineOutlinedIcon color="error" />
                        </Button>
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
          </Paper>
        )}
      </Box>
      <DeleteAlertDialog
        dialogTitle="Do you want to delete this policy?"
        handleDeleteButton={handleDelete}
        isOpened={isDeleteDialogOpened}
        setIsOpened={setIsDeleteDialogOpened}
      />
    </AccountLayout>
  );
};

export default PolicyPage;
