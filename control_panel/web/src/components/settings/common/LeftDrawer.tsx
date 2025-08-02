import { Box, List, ListItem, ListItemButton, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

type LeftDrawerItemProps = {
  title: string;
  link: string;
  namespace: string | null;
};
const LeftDrawer = () => {
  const navigate = useNavigate();
  const LeftDrawerItem = ({ title, link }: LeftDrawerItemProps) => {
    return (
      <ListItem>
        <ListItemButton onClick={() => navigate(link)}>{title}</ListItemButton>
      </ListItem>
    );
  };
  const items: LeftDrawerItemProps[] = [
    { link: "/settings/profile", title: "Profile", namespace: null },
    { link: "/settings/accounts", title: "Accounts", namespace: null },
    { link: "/settings/llmconfig", title: "Providers", namespace: null },
    { link: "/settings/policies", title: "Policies", namespace: null },
    { link: "/settings/apikey", title: "Applications", namespace: null },
    { link: "/settings/modelpool", title: "Model Pools", namespace: null },
    { link: "/settings/configuration", title: "Configuration", namespace: null },
    { link: "/settings/roles", title: "Roles", namespace: null },
  ];
  return (
    <Box
      px="16px"
      py="53px"
      minHeight={"inherit"}
      style={{
        backgroundColor: "#F4F5F5",
        borderRight: "1px solid #E1E3E3",
        maxWidth: "15%",
      }}
    >
      <Typography fontSize="16px" fontWeight="600">
        Settings
      </Typography>
      <List>{items.filter(el => el).map(LeftDrawerItem)}</List>
    </Box>
  );
};

export default LeftDrawer;
