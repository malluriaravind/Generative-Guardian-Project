import { Toolbar, AppBar, Box, Button } from "@mui/material";
import { API_DOMAIN } from "../../constants";
import TokenDialogButton from "../common/TokenDialogButton";

const Header = () => {
  return (
    <AppBar position="relative" color="default">
      <Toolbar>
        <Box sx={{ flexGrow: 1 }} />
        <TokenDialogButton />
        <Button
          onClick={() => {
            window.location.href = `${API_DOMAIN}/api/reference`;
          }}
        >
          Docs
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
