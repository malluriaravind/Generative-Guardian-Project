import {
  TableCell,
  TableHead,
  TableRow,
  TableBody,
  Table,
  TableContainer,
  styled,
  TablePagination,
} from "@mui/material";
import { useState } from "react";
import { AlertResponse } from "../../../types/alert";
import DeleteAlertDialog from "../../DeleteAlertDialog";
import { useDeleteAlertMutation } from "../../../api/alert";
import AlertTableRow from "./AlertTableRow";
const BoldTableCell = styled(TableCell)({
  fontWeight: "bold",
  padding: "4px  4px  5px  20px",
});

type AlertTableProps = {
  data: AlertResponse[];
  setEditDrawer: (isOpen: boolean) => void;
  setCurrentAlert: (value: AlertResponse) => void;
  selectedAlertId: string | null;
};

const AlertTable = ({
  data,
  setCurrentAlert,
  selectedAlertId,
  setEditDrawer,
}: AlertTableProps) => {
  const [deleteAlert] = useDeleteAlertMutation();
  const [isDeleteDialogOpened, setDeleteDialogOpened] =
    useState<boolean>(false);
  const [currentAlertId, setCurrentAlertId] = useState<string | null>(null);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 100));
    setPage(0);
  };

  return (
    <>
      <TableContainer>
        <Table aria-label="simple table">
          <TableHead>
            <TableRow>
              <BoldTableCell>Name</BoldTableCell>
              <BoldTableCell>Threshold</BoldTableCell>
              <BoldTableCell align="right">Limit</BoldTableCell>
              <BoldTableCell align="right">Forecasted</BoldTableCell>
              <BoldTableCell align="right">Current Vs Budget</BoldTableCell>
              <BoldTableCell align="center">Action</BoldTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((item) => (
                <AlertTableRow
                  key={item._id}
                  item={item}
                  isSelected={item._id === selectedAlertId}
                  setCurrentAlert={setCurrentAlert}
                  setCurrentAlertId={setCurrentAlertId}
                  setDeleteDialogOpened={setDeleteDialogOpened}
                  setEditDrawer={setEditDrawer}
                />
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[100, 250]}
          component="div"
          count={data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
      <DeleteAlertDialog
        dialogTitle="Do you want to delete alert?"
        handleDeleteButton={async () => {
          if (!currentAlertId) {
            return;
          }
          await deleteAlert({ id: currentAlertId });
          setCurrentAlertId(null);
        }}
        isOpened={isDeleteDialogOpened}
        setIsOpened={setDeleteDialogOpened}
        dialogText=""
      />
    </>
  );
};

export default AlertTable;
