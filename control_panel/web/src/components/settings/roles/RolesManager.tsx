import { useCallback, useMemo, useState } from "react";
import { Box, CircularProgress, Paper } from "@mui/material";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useDeleteRoleMutation, useFetchRolesQuery } from "../../../api/roles";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import RolesDrawer from "../../../components/roles/RolesDialog";
import { Role } from "../../../types/roles";
import DeleteAlertDialog from "../../DeleteAlertDialog";

const RolesManager = () => {
  const { data: roles, isLoading } = useFetchRolesQuery();
  const [isDrawerOpened, setIsDrawerOpened] = useState(false);
  const [modelToEdit, setModelToEdit] = useState<Role | undefined>(undefined);
  const [deleteRole] = useDeleteRoleMutation();
  const [isDeleteDialogOpened, setIsDeleteDialogOpened] = useState(false);
  const [roleIdToDelete, setRoleIdToDelete] = useState<string | undefined>(undefined);

  const handleCloseDialog = () => {
    setIsDrawerOpened(false);
    setModelToEdit(undefined);
  };
  const handleEditClick = useCallback((model: Role) => {
    setModelToEdit(model);
    setIsDrawerOpened(true);
  }, []);

  const confirmDelete = async () => {
    if (typeof roleIdToDelete === "undefined") return;
    await deleteRole({id: roleIdToDelete});
    setIsDeleteDialogOpened(false);
  }

  const columns: GridColDef<Role>[] = [
    {
      field: "name",
      headerName: "Name",
      minWidth: 100,
      flex: 1,
      headerAlign: "left",
      align: "left",
    },
    {
      field: "comment",
      headerName: "Comment",
      minWidth: 200,
      flex: 3,
      headerAlign: "left",
      align: "left",
    },
    {
      field: "action",
      type: "actions",
      headerName: "Action",
      flex: 2,
      headerAlign: "center",
      align: "center",
      getActions: ({ row }) => [
        <GridActionsCellItem
          icon={<EditOutlinedIcon color="primary" />}
          onClick={() => {
            handleEditClick(row);
          }}
          label="Edit"
        />,
        <GridActionsCellItem
          icon={<DeleteOutlineOutlinedIcon color="error" />}
          onClick={() => {
            setIsDeleteDialogOpened(true);
            setRoleIdToDelete(row._id);
          }}
          label="Delete"
        />,
      ],
    },
  ];

  const rows = useMemo(
    () => roles?.map((el, index) => ({ ...el, id: index })),
    [roles],
  );

  if (isLoading) {
    return <CircularProgress />;
  }

  return (
    <Box marginTop={1} component={Paper}>
      <DataGrid
        columns={columns}
        rows={rows ?? []}
        hideFooterPagination={true}
        hideFooter={true}
      />
      {isDrawerOpened && (
        <RolesDrawer
          open={isDrawerOpened}
          onClose={handleCloseDialog}
          model={modelToEdit}
        />
      )}
      <DeleteAlertDialog
        dialogTitle="Are you sure you want to delete this role?"
        handleDeleteButton={confirmDelete}
        isOpened={isDeleteDialogOpened}
        setIsOpened={setIsDeleteDialogOpened}
      />
    </Box>
  );
};

export default RolesManager;
