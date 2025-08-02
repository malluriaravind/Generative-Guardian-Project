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
  TableSortLabel,
  Typography,
} from "@mui/material";
import AccountLayout from "../../layouts/account/AccountLayout";
import ApiKeyGenDrawer from "../../components/settings/apikey/ApiKeyGenDrawer";
import { useGetApiKeysQuery, useDeleteApiKeyMutation } from "../../api/apikey";
import { useFetchLlmQuery } from "../../api/llm";
import { ApiKeyResponse } from "../../types/apikey";
import DeleteAlertDialog from "../../components/DeleteAlertDialog";
import ApiKeyDialog from "../../components/settings/apikey/ApiKeyDialog";
import SearchField from "../../components/common/SearchField";
import { StyledTableRow } from "../../components/common/StyledTableRow";
import { StyledTableCell } from "../../components/common/StyledTableCell";
import CustomPagination from "../../components/common/CustomPagination";
import useSortableData from "../../hooks/useSortableData";
import moment from "moment";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";

const ApiKeyGenPage = () => {
  // Applications state and query
  const { data: apiKeys, isLoading, refetch } = useGetApiKeysQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { data: llmsData } = useFetchLlmQuery();
  const [deleteApiKey] = useDeleteApiKeyMutation();

  // Local UI states
  const [currentApiKey, setCurrentApiKey] = useState<ApiKeyResponse | null>(null);
  const [isDeleteDialogOpened, setIsDeleteDialogOpened] = useState<boolean>(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [openDrawer, setOpenDrawer] = useState<boolean>(false);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Compute a mapping from llm _id to its name
  const llmsNames = useMemo(() => {
    if (!llmsData) return {};
    return llmsData.reduce((acc, el) => ({ ...acc, [el._id]: el.name }), {});
  }, [llmsData]);

  // Filter Applications based on the search text (by name)
  const filteredKeys = useMemo(() => {
    if (!apiKeys) return [];
    return apiKeys.filter((key) =>
      key.name.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [apiKeys, searchText]);

  // Use the centralized sorting hook – default sort by "name" in ascending order.
  const { sortedItems, requestSort, sortConfig } = useSortableData(filteredKeys, {
    key: "name",
    direction: "asc",
  });

  // Paginate the sorted items
  const paginatedKeys = useMemo(() => {
    return sortedItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedItems, page, rowsPerPage]);

  // Computes a comma-separated string for LLM access names
  const getAccessString = (key: ApiKeyResponse) => {
    if (!llmsNames || Object.keys(llmsNames).length === 0) return "";
    return key.llm_access
      .map(id => llmsNames[id])
      .filter((name) => !!name)
      .join(", ");
  };

  // Delete handler that calls the deletion mutation and refreshes the data later
  const handleDelete = async () => {
    if (currentApiKey) {
      await deleteApiKey({ id: currentApiKey._id });
      setCurrentApiKey(null);
      setIsDeleteDialogOpened(false);
      refetch();
    }
  };

  // Close function for the API key dialog/drawer
  const closeApiKeyDialog = () => {
    setNewApiKey(null);
    setOpenDrawer(false);
  };

  return (
    <AccountLayout
      broadcrumbs={["Home", "Applications"]}
      title="Applications"
      subTitle="Manage your API Keys"
      drawer={{
        button: (
          <Button
            color="primary"
            size="small"
            variant="contained"
            sx={{ marginLeft: "auto" }}
            onClick={() => {
              setCurrentApiKey(null);
              setOpenDrawer(true);
            }}
          >
            <Typography>ADD API KEY</Typography>
          </Button>
        ),
        drawerBody: openDrawer ? (
          <ApiKeyGenDrawer
            isDrawerOpened={openDrawer}
            setOpenDrawer={setOpenDrawer}
            current={currentApiKey}
            setNewApiKey={setNewApiKey}
          />
        ) : null,
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
        <SearchField
          value={searchText}
          onChange={setSearchText}
          placeholder="Search Applications..."
          debounceTime={300}
        />
        {isLoading || !apiKeys ? (
          <CircularProgress />
        ) : (
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <StyledTableRow>
                    <StyledTableCell variantType="header">
                      <TableSortLabel
                        active={sortConfig.key === "name"}
                        direction={sortConfig.key === "name" ? sortConfig.direction : "asc"}
                        onClick={() => requestSort("name")}
                      >
                        Name
                      </TableSortLabel>
                    </StyledTableCell>
                    <StyledTableCell variantType="header">Access</StyledTableCell>
                    <StyledTableCell variantType="header">
                      <TableSortLabel
                        active={sortConfig.key === "created_at"}
                        direction={sortConfig.key === "created_at" ? sortConfig.direction : "asc"}
                        onClick={() => requestSort("created_at")}
                      >
                        Created
                      </TableSortLabel>
                    </StyledTableCell>
                    <StyledTableCell variantType="header">
                      <TableSortLabel
                        active={sortConfig.key === "expires_at"}
                        direction={sortConfig.key === "expires_at" ? sortConfig.direction : "asc"}
                        onClick={() => requestSort("expires_at")}
                      >
                        Expiration
                      </TableSortLabel>
                    </StyledTableCell>
                    <StyledTableCell variantType="header">Key</StyledTableCell>
                    <StyledTableCell variantType="header">Action</StyledTableCell>
                  </StyledTableRow>
                </TableHead>
                <TableBody>
                  {paginatedKeys.map((key) => (
                    <StyledTableRow key={key._id}>
                      <StyledTableCell>{key.name}</StyledTableCell>
                      <StyledTableCell>{getAccessString(key)}</StyledTableCell>
                      <StyledTableCell>
                        {moment(key.created_at).format("DD-MMM-YYYY")}
                      </StyledTableCell>
                      <StyledTableCell>
                        {key.expires_at ? moment(key.expires_at).format("DD-MMM-YYYY") : "-"}
                      </StyledTableCell>
                      <StyledTableCell>{`***${key.api_key_suffix}`}</StyledTableCell>
                      <StyledTableCell>
                        <Button
                          onClick={() => {
                            setCurrentApiKey(key);
                            setOpenDrawer(true);
                          }}
                          variant="text"
                        >
                          <EditOutlinedIcon color="primary" />
                        </Button>
                        <Button
                          onClick={() => {
                            setCurrentApiKey(key);
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
        dialogTitle="Do you want to delete this API key?"
        handleDeleteButton={handleDelete}
        isOpened={isDeleteDialogOpened}
        setIsOpened={setIsDeleteDialogOpened}
      />
      <ApiKeyDialog
        apiKey={newApiKey!}
        onHandleClose={closeApiKeyDialog}
        open={!!newApiKey}
      />
    </AccountLayout>
  );
};

export default ApiKeyGenPage;
