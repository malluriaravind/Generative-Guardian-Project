import { useState, useMemo } from "react";
import {
  Box,
  Button,
  LinearProgress,
  Paper,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableSortLabel,
  Typography,
} from "@mui/material";
import AccountLayout from "../../layouts/account/AccountLayout";
// import LeftDrawer from "../../components/settings/common/LeftDrawer";
import ModelPoolDrawer from "../../components/settings/modelpool/ModelPoolDrawer";
import { useFetchModelPoolsQuery, useDeleteModelPoolMutation } from "../../api/modelpool";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DeleteAlertDialog from "../../components/DeleteAlertDialog";
import SearchField from "../../components/common/SearchField";
import { StyledTableRow } from "../../components/common/StyledTableRow";
import { StyledTableCell } from "../../components/common/StyledTableCell";
import CustomPagination from "../../components/common/CustomPagination";
import useSortableData from "../../hooks/useSortableData";
import { ModelPoolResponse } from "../../types/modelpool";

const ModelPoolPage = () => {
    // States for drawer, delete dialog and search/pagination
    const [openDrawer, setOpenDrawer] = useState(false);
    const [currentModelPool, setCurrentModelPool] = useState<ModelPoolResponse | null>(null);
    const [isDeleteDialogOpened, setIsDeleteDialogOpened] = useState<boolean>(false);
    const [searchText, setSearchText] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Fetch model pool data
    const { data: modelPools, isLoading, isFetching, refetch } = useFetchModelPoolsQuery(undefined, {
        refetchOnMountOrArgChange: true,
    });
    const [deleteModelPool] = useDeleteModelPoolMutation();

    // Filter model pools based on search text. We search in pool name, virtual model name, and
    // in stringified models (each as "llm_name - alias")
    const filteredPools = useMemo(() => {
        if (!modelPools) return [];
        return modelPools.filter((pool) => {
            const searchStr = `${pool.name} ${pool.virtual_model_name} ${pool.models
                .map((m) => `${m.llm_name} - ${m.alias}`)
                .join(" ")}`.toLowerCase();
            return searchStr.includes(searchText.toLowerCase());
        });
    }, [modelPools, searchText]);

    // Use centralized sorting hook with default sort by "name" ascending
    const { sortedItems, requestSort, sortConfig } = useSortableData(filteredPools, {
        key: "name",
        direction: "asc",
    });

    // Paginate sorted items
    const paginatedPools = useMemo(() => {
        return sortedItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [sortedItems, page, rowsPerPage]);

    // Handler for deletion
    const handleDelete = async () => {
        if (currentModelPool) {
            await deleteModelPool({ id: currentModelPool._id });
            setIsDeleteDialogOpened(false);
            refetch();
        }
    };

    // Button to open the drawer for creating a new pool
    const DrawerButton = () => (
        <Button
            color="primary"
            size="small"
            variant="contained"
            sx={{ marginLeft: "auto" }}
            onClick={() => {
                setCurrentModelPool(null);
                setOpenDrawer(true);
            }}
        >
            <Typography>ADD Pool</Typography>
        </Button>
    );

    return <AccountLayout
        broadcrumbs={["Home", "Manage Model Pools"]}
        drawer={{
            button: <DrawerButton />,
            drawerBody: openDrawer ? <ModelPoolDrawer
                current={currentModelPool}
                setCurrentModel={setCurrentModelPool}
                isDrawerOpened={openDrawer}
                setOpenDrawer={setOpenDrawer}
            /> : null,
        }}
        leftPanel={null}
        subTitle=""
        title="Model Pools"
    >
        <Box
            sx={{
                marginTop: "16px",
                padding: "48px 32px",
                backgroundColor: "white",
                borderRadius: "8px",
            }}
        >
            {isLoading || isFetching || !modelPools ? (
                <LinearProgress />
            ) : (
                <>
                    <Paper sx={{ padding: "16px", borderRadius: "8px" }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                            <SearchField
                                value={searchText}
                                onChange={setSearchText}
                                placeholder="Search pools..."
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
                                                direction={sortConfig.key === "name" ? sortConfig.direction : "asc"}
                                                onClick={() => requestSort("name")}
                                            >
                                                Pool Name
                                            </TableSortLabel>
                                        </StyledTableCell>
                                        <StyledTableCell variantType="header">
                                            <TableSortLabel
                                                active={sortConfig.key === "virtual_model_name"}
                                                direction={sortConfig.key === "virtual_model_name" ? sortConfig.direction : "asc"}
                                                onClick={() => requestSort("virtual_model_name")}
                                            >
                                                Virtual Model Name
                                            </TableSortLabel>
                                        </StyledTableCell>
                                        <StyledTableCell variantType="header">Models in Pool</StyledTableCell>
                                        <StyledTableCell variantType="header">Action</StyledTableCell>
                                    </StyledTableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedPools.map((pool) => (
                                        <StyledTableRow key={pool._id}>
                                            <StyledTableCell>{pool.name}</StyledTableCell>
                                            <StyledTableCell>{pool.virtual_model_name}</StyledTableCell>
                                            <StyledTableCell>
                                                {pool.models.map((model) => `${model.llm_name} - ${model.alias}`).join(", ")}
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Button
                                                    onClick={() => {
                                                        setCurrentModelPool(pool);
                                                        setOpenDrawer(true);
                                                    }}
                                                    variant="text"
                                                >
                                                    <EditOutlinedIcon color="primary" />
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        setCurrentModelPool(pool);
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
                </>
            )}
        </Box>
        <DeleteAlertDialog
            dialogTitle="Are you sure you want to delete this pool?"
            handleDeleteButton={handleDelete}
            isOpened={isDeleteDialogOpened}
            setIsOpened={setIsDeleteDialogOpened}
        />
    </AccountLayout>;
};

export default ModelPoolPage;