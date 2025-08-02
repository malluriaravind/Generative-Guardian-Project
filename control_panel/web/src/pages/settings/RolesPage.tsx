import AccountLayout from "../../layouts/account/AccountLayout";
import RolesManager from "../../components/settings/roles/RolesManager";
import { Button, Typography } from "@mui/material";
import { useState } from "react";
import RolesDrawer from "../../components/roles/RolesDialog";

const RolesPage = () => {
  const [isDrawerOpened, setIsDrawerOpened] = useState(false);

  const handleCloseDialog = () => {
    setIsDrawerOpened(false);
  };

  return (
    <AccountLayout
      leftPanel={null}
      broadcrumbs={["Home", "Settings", "Roles"]}
      subTitle="Configure roles"
      title="Roles"
      drawer={{
        button: (
          <Button
            color="primary"
            size="small"
            variant="contained"
            sx={{ marginLeft: "auto" }}
            onClick={() => {
              setIsDrawerOpened(true);
            }}
          >
            <Typography>CREATE ROLE</Typography>
          </Button>
        ),
        drawerBody: isDrawerOpened ? (
          <RolesDrawer
            open={isDrawerOpened}
            onClose={handleCloseDialog}
            model={undefined}
          />
        ) : null,
      }}
    >
      <RolesManager />
    </AccountLayout>
  );
};

export default RolesPage;
