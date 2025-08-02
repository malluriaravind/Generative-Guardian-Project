import {
  Button,
  Checkbox,
  LinearProgress,
  Stack,
  TextField,
} from "@mui/material";
import {
  useGetTokensQuery,
  useIssueTokenMutation,
  useRevokeTokenMutation,
} from "../../api/tokens";
import { TokenDialogProps } from "../../types/dialogs/tokenDialogProps";
import CustomDialog from "../common/CustomDialog";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import React, { useState } from "react";
import DeleteAlertDialog from "../DeleteAlertDialog";
import { isNumber } from "lodash";
import IssueDialog from "../common/IssueDialog";
import moment from "moment";

const TokenDialog = ({ isOpened, onClose }: TokenDialogProps) => {
  const [revokeToken] = useRevokeTokenMutation();
  const [issueToken] = useIssueTokenMutation();
  const { data, isLoading } = useGetTokensQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [daysUntil, setDaysUntil] = useState<number>(1);
  const [daysUntilErrorMessage, setDaysUntilErrorMessage] =
    useState<string>("");
  const [deleteRowJti, setDeleteRowJti] = useState<string | null>(null);
  const [isDeleteDialogOpened, setIsDeleteDialogOpened] =
    useState<boolean>(false);
  const [newIssueToken, setNewIssueToken] = useState<string | null>(null);

  const rows = data?.map((el, index) => ({ ...el, id: index }));

  const deleteRow = async () => {
    if (!deleteRowJti) {
      return;
    }
    await revokeToken({ token: deleteRowJti });
  };

  const handleDaysUntilChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setDaysUntil(+event.target.value);
    setDaysUntilErrorMessage("");
  };

  const handleGenerateNewToken = async () => {
    if (!isNumber(daysUntil) || isNaN(daysUntil) || daysUntil <= 0) {
      setDaysUntilErrorMessage(
        "Please enter a valid whole number greater than 0"
      );
    }
    setDaysUntilErrorMessage("");
    const { data: issueData } = await issueToken({
      daysUntilExpiration: daysUntil,
    });
    setNewIssueToken(issueData.token);
  };

  const columns: GridColDef[] = [
    {
      field: "mask",
      headerName: "Mask",
      flex: 4,
      renderCell: (param) => `***${param.value}***`,
    },
    {
      field: "expires_at",
      headerName: "Expires At",
      flex: 4,
      valueGetter: (params) => moment(params.value).local(),
    },
    {
      field: "current",
      headerName: "Current",
      flex: 1,
      renderCell: (param) => <Checkbox checked={param.value} disabled />,
    },
    {
      field: "action",
      type: "actions",
      headerName: "Action",
      flex: 1,
      headerAlign: "left",
      align: "left",
      getActions: ({ row }) => [
        <GridActionsCellItem
          icon={<DeleteOutlineOutlinedIcon color="primary" />}
          onClick={async () => {
            setIsDeleteDialogOpened(true);
            setDeleteRowJti(row.jti);
          }}
          label="Delete"
        />,
      ],
    },
  ];

  return (
    <React.Fragment>
      <IssueDialog
        token={newIssueToken || ""}
        onHandleClose={() => setNewIssueToken(null)}
        open={!!newIssueToken}
      />
      <CustomDialog
        open={isOpened}
        onClose={onClose}
        title={"Token List"}
        subtitle={"Add/remove your tokens"}
      >
        {isLoading || !data ? (
          <LinearProgress color="primary" />
        ) : (
          <React.Fragment>
            <DataGrid
              columns={columns}
              rows={rows ?? []}
              hideFooterPagination={true}
              hideFooter={true}
            />
            <Stack
              marginTop={2}
              direction={"row"}
              alignContent={"center"}
              gap={1}
              justifyContent={"right"}
            >
              <TextField
                id="days-until-field"
                label="Days until token expiration"
                type="number"
                value={daysUntil}
                error={!!daysUntilErrorMessage}
                onChange={handleDaysUntilChange}
                helperText={daysUntilErrorMessage}
                InputProps={{ inputProps: { min: 1, step: 1 } }}
              />
              <Button variant="contained" onClick={handleGenerateNewToken}>
                Issue a new token
              </Button>
            </Stack>
          </React.Fragment>
        )}
      </CustomDialog>
      <DeleteAlertDialog
        dialogTitle="Do you want to revoke this token?"
        handleDeleteButton={deleteRow}
        setIsOpened={setIsDeleteDialogOpened}
        dialogText={null}
        isOpened={isDeleteDialogOpened}
      />
    </React.Fragment>
  );
};

export default TokenDialog;
