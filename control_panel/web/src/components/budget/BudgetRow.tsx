import React from "react";
import { useTheme } from "@mui/material/styles";
import { StyledTableRow } from "../common/StyledTableRow";
import { StyledTableCell } from "../common/StyledTableCell";
import AccountActionButton from "../common/AccountActionButton";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { Budget } from "../../types/budget";

type BudgetItemProps = {
  item: Budget;
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
};

const BudgetRow: React.FC<BudgetItemProps> = ({ item, onEdit, onDelete }) => {
  const theme = useTheme();
  const { name, watch, period, budget, _id } = item;

  return (
    <StyledTableRow clickable>
      <StyledTableCell>{name}</StyledTableCell>
      <StyledTableCell>{watch[0]?.name || "N/A"}</StyledTableCell>
      <StyledTableCell>{period}</StyledTableCell>
      <StyledTableCell align="right">${budget.toLocaleString()}</StyledTableCell>
      <StyledTableCell>
        <AccountActionButton
          tooltip="Edit Budget"
          icon={<EditOutlinedIcon />}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          buttonProps={{
            color: "primary",
            sx: { transition: "transform 0.2s", "&:hover": { transform: "scale(1.2)" } },
          }}
        />
        <AccountActionButton
          tooltip="Delete Budget"
          icon={<DeleteOutlineOutlinedIcon />}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(_id);
          }}
          buttonProps={{
            color: "error",
            sx: { transition: "transform 0.2s", "&:hover": { transform: "scale(1.2)" } },
          }}
        />
      </StyledTableCell>
    </StyledTableRow>
  );
};

export default BudgetRow; 