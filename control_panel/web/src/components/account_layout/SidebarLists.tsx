import React from "react";
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { SidebarItemProps } from "./SidebarItems";

type SidebarListsProps = SidebarItemProps & {
  selected: boolean;
  onClick: () => void;
};

const SidebarLists: React.FC<SidebarListsProps> = ({
  text,
  isChild,
  selected,
  onClick,
  icon,
}) => (
  <ListItem disablePadding alignItems="center" sx={{ minHeight: '40px' }}>
    <ListItemButton
      sx={{
        marginLeft: isChild ? "20px" : "10px",
        backgroundColor: selected ? "#ADD8E6" : "transparent",
        borderRadius: selected ? "5px" : "transparent",
        border: selected ? "1px solid #0B69DB" : "transparent",
        py: 0.5,
        '&:hover': {
          backgroundColor: "#f0f0f0",
        },
      }}
      selected={selected}
      onClick={onClick}
    >
      <ListItemIcon
        sx={{
          minWidth: '40px',
          color: selected ? "#0B69DB" : "inherit",
          justifyContent: 'center',
        }}
      >
        {React.cloneElement(icon as React.ReactElement, { fontSize: 'small' })}
      </ListItemIcon>
      <ListItemText
        primary={text}
        primaryTypographyProps={{
          sx: {
            color: selected ? "#0B69DB" : "black",
            fontWeight: selected ? 700 : 500,
            fontSize: '14px',
          },
          ml: "3%",
        }}
      />
    </ListItemButton>
  </ListItem>
);

export default SidebarLists;
