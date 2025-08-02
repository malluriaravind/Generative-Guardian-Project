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
  IconButton,
  Switch,
} from "@mui/material";
import { useNavigate } from "react-router";
import AccountLayout from "../../layouts/account/AccountLayout";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import LLmTestButton from "../../components/settings/llm/common/LlmTestButton";
import DeleteAlertDialog from "../../components/DeleteAlertDialog";
import SearchField from "../../components/common/SearchField";
import { StyledTableRow } from "../../components/common/StyledTableRow";
import { StyledTableCell } from "../../components/common/StyledTableCell";
import CustomPagination from "../../components/common/CustomPagination";
import useSortableData from "../../hooks/useSortableData";
import moment from "moment";
import {
  useFetchLlmQuery,
  useDeleteLlmMutation,
  useDisableLlmMutation,
  useEnableLlmMutation,
} from "../../api/llm";

// Colors mapping (feel free to adjust)
const statusColors: { [key: string]: string } = {
  Pending: "orange",
  Connected: "green",
  Error: "red",
};

const LLMConfigurationPage = () => {
  const navigate = useNavigate();

  // Fetch LLM providers
  const {
    data: providers,
    isLoading,
    refetch,
  } = useFetchLlmQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [deleteLlm] = useDeleteLlmMutation();
  const [disableLlm] = useDisableLlmMutation();
  const [enableLlm] = useEnableLlmMutation();

  // Local states for search, pagination and deletion
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [isDeleteDialogOpened, setIsDeleteDialogOpened] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);

  // Filter providers based on search text (simple filtering by name)
  const filteredProviders = useMemo(() => {
    if (!providers) return [];
    return providers.filter((provider: any) =>
      provider.name?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [providers, searchText]);

  // Centralized sorting (default sort by provider name, ascending)
  const { sortedItems, requestSort, sortConfig } = useSortableData(
    filteredProviders,
    {
      key: "name",
      direction: "asc",
    }
  );

  // Paginate sorted data
  const paginatedProviders = useMemo(() => {
    return sortedItems.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [sortedItems, page, rowsPerPage]);

  // Delete handler
  const handleDelete = async () => {
    if (!selectedProvider) return;
    await deleteLlm({ id: selectedProvider._id });
    setIsDeleteDialogOpened(false);
    setSelectedProvider(null);
    refetch();
  };

  // Drawer button: navigate to add/edit provider
  const DrawerButton = () => (
    <Button
      color="primary"
      size="small"
      variant="contained"
      sx={{ marginLeft: "auto" }}
      onClick={() => navigate("/settings/llmconfig/manage")}
    >
      <Typography>Add Provider</Typography>
    </Button>
  );

  return (
    <AccountLayout
      broadcrumbs={["Home", "Providers"]}
      title="Providers"
      subTitle="Manage model providers and models"
      drawer={{
        button: <DrawerButton />,
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
        {isLoading || !providers ? (
          <LinearProgress />
        ) : (
          <Paper sx={{ padding: 2, borderRadius: "8px" }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
            >
              <SearchField
                value={searchText}
                onChange={setSearchText}
                placeholder="Search providers..."
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
                        Name
                      </TableSortLabel>
                    </StyledTableCell>
                    <StyledTableCell variantType="header">
                      Status
                    </StyledTableCell>
                    <StyledTableCell variantType="header">
                      <TableSortLabel
                        active={sortConfig.key === "created_by"}
                        direction={
                          sortConfig.key === "created_by"
                            ? sortConfig.direction
                            : "asc"
                        }
                        onClick={() => requestSort("created_by")}
                      >
                        Creator
                      </TableSortLabel>
                    </StyledTableCell>
                    <StyledTableCell variantType="header">
                      <TableSortLabel
                        active={sortConfig.key === "added_at"}
                        direction={
                          sortConfig.key === "added_at"
                            ? sortConfig.direction
                            : "asc"
                        }
                        onClick={() => requestSort("added_at")}
                      >
                        Date Created
                      </TableSortLabel>
                    </StyledTableCell>
                    <StyledTableCell variantType="header">
                      API Key Suffix
                    </StyledTableCell>
                    <StyledTableCell variantType="header">
                      Action
                    </StyledTableCell>
                  </StyledTableRow>
                </TableHead>
                <TableBody>
                  {paginatedProviders.map((provider: any) => (
                    <StyledTableRow key={provider._id}>
                      <StyledTableCell>{provider.name}</StyledTableCell>
                      <StyledTableCell>
                        <Typography
                          color={statusColors[provider.status] || "gray"}
                          whiteSpace="nowrap"
                        >
                          ● {provider.status}
                        </Typography>
                      </StyledTableCell>
                      <StyledTableCell>{provider.created_by}</StyledTableCell>
                      <StyledTableCell>
                        <Typography whiteSpace="nowrap">
                          {moment(provider.added_at).format("DD-MMM-YYYY")}
                        </Typography>
                      </StyledTableCell>
                      <StyledTableCell>{`***${provider.api_key_suffix}`}</StyledTableCell>
                      <StyledTableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Switch
                            checked={provider.status !== "Disabled"}
                            onClick={async () =>
                              provider.status === "Disabled"
                                ? await enableLlm({ id: provider._id })
                                : await disableLlm({ id: provider._id })
                            }
                          />
                          <IconButton
                            onClick={() =>
                              navigate(
                                `/settings/llmconfig/manage/${provider._id}`
                              )
                            }
                          >
                            <EditOutlinedIcon color="primary" />
                          </IconButton>
                          <LLmTestButton
                            llmId={provider._id}
                            status={
                              provider.status === "Connected"
                                ? "success"
                                : provider.status === "Error"
                                ? "error"
                                : "primary"
                            }
                          />
                          <IconButton
                            onClick={() => {
                              setSelectedProvider(provider);
                              setIsDeleteDialogOpened(true);
                            }}
                          >
                            <DeleteOutlineOutlinedIcon color="error" />
                          </IconButton>
                        </Box>
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
                setRowsPerPage(parseInt(event.target.value, 100));
                setPage(0);
              }}
            />
          </Paper>
        )}
      </Box>
      <DeleteAlertDialog
        dialogTitle="Do you want to delete this LLM provider?"
        handleDeleteButton={handleDelete}
        isOpened={isDeleteDialogOpened}
        setIsOpened={setIsDeleteDialogOpened}
      />
    </AccountLayout>
  );
};

export default LLMConfigurationPage;
