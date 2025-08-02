import {
  Table,
  TableRow,
  TableCell,
  Collapse,
  IconButton,
  TableBody,
  TableHead,
  TableContainer,
  styled,
  Box,
} from "@mui/material";
import { ReactNode, useState } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

const BoldTableCell = styled(TableCell)({ fontWeight: "bold", padding: "4px 4px 5px 20px" });
const CustomeTableContainer = styled(TableContainer)({
  border: "1px solid rgba(224, 224, 224, 1)",
  borderRadius: "8px",
  padding: "4px",
});

type CollapsibleTableRowProps = {
  cells: (string | ReactNode)[];
  body: ReactNode;
};

type CollapsibleTableProps = {
  columns: string[];
  rows: CollapsibleTableRowProps[];
};

const CollapsibleTableRow = ({ cells, body }: CollapsibleTableRowProps) => {
  const [isOpened, setIsOpened] = useState(false);
  return (
    <>
      <TableRow sx={{ padding: "4px" }}>
        <TableCell sx={{ padding: "4px", width: "auto" }}>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setIsOpened(!isOpened)}
          >
            {isOpened ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        {cells.map((cell) => (
          <TableCell sx={{ padding: "4px", width: "auto" }}>{cell}</TableCell>
        ))}
      </TableRow>
      {isOpened && (
        <TableRow sx={{ padding: "4px" }}>
          <TableCell
            sx={{ padding: "4px", paddingBottom: 0, paddingTop: 0 }}
            colSpan={cells.length + 1}
          >
            <Collapse in={isOpened} timeout="auto" sx={{ padding: 0 }}>
              <Box sx={{ margin: 1 }}>{body}</Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

const CollapsibleTable = ({ columns, rows }: CollapsibleTableProps) => {
  return (
    <CustomeTableContainer>
      <Table aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell />
            {columns.map((column) => (
              <BoldTableCell>{column}</BoldTableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <CollapsibleTableRow key={index} {...row} />
          ))}
        </TableBody>
      </Table>
    </CustomeTableContainer>
  );
};

export default CollapsibleTable;
