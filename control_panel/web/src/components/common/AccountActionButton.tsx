import React from "react";
import { Tooltip, IconButton } from "@mui/material";
import { GridActionsCellItem } from "@mui/x-data-grid";

export interface AccountActionButtonProps {
  tooltip: string;
  icon: React.ReactNode;
  onClick: (event: React.MouseEvent<any>) => void;
  variant?: "default" | "datagrid";
  buttonProps?: Partial<React.ComponentProps<typeof IconButton>>;
}

const AccountActionButton: React.FC<AccountActionButtonProps> = ({
  tooltip,
  icon,
  onClick,
  variant = "default",
  buttonProps,
}) => {
  if (variant === "datagrid") {
    return (
      <GridActionsCellItem
        icon={icon}
        onClick={onClick}
        label={tooltip}
      />
    );
  }

  return (
    <Tooltip title={tooltip} arrow>
      <IconButton onClick={onClick} {...buttonProps}>
        {icon}
      </IconButton>
    </Tooltip>
  );
};

export default AccountActionButton; 