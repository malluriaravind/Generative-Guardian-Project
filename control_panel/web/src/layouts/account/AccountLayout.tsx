import { Box, Breadcrumbs, Typography } from "@mui/material";
import React, { useEffect } from "react";
import Sidebar from "../../components/account_layout/Sidebar";
import Header from "../../components/account_layout/Header";
import { drawerWidth } from "../../constants";
import { PageProps, SwipeableDrawerProps } from "../../types";
import { useAppSelector } from "../../store";
import { useApplyProfileInfoMutation } from "../../api/user";
import AlertMessage from "../../components/AlertMessage";

type AccountLayoutProps = React.PropsWithChildren &
  Omit<PageProps, "layout"> & {
    leftPanel: React.ReactNode | null;
    drawer: SwipeableDrawerProps | null;
  };
const AccountLayout = ({
  children,
  leftPanel = null,
  drawer,
  title,
  subTitle,
  broadcrumbs,
}: AccountLayoutProps) => {
  const user = useAppSelector((state) => state.user);
  const [applyUserInfo] = useApplyProfileInfoMutation();
  async function getUserInfo() {
    await applyUserInfo();
  }
  useEffect(() => {
    if (!user.email || !user.firstName) {
      getUserInfo();
    }
  }, [user.firstName, user.email]);
  return (
    <Box display="flex" flexDirection="row">
      <AlertMessage />
      <Box width={drawerWidth}>
        <Sidebar />
      </Box>
      <Box
        display="flex"
        flexDirection="column"
        sx={{
          minHeight: "100vh",
          width: { sm: `calc(100% - ${drawerWidth})` },
          marginLeft: "auto",
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
        }}
      >
        <Box
          display="flex"
          minHeight="100vh"
          flexDirection="column"
          width="100%"
        >
          <Box>
            <Header />
          </Box>
          <Box display="flex" flexGrow={1}>
            <Box
              display="flex"
              flexDirection="row"
              width="100%"
              sx={{ backgroundColor: "#EFF1F1" }}
            >
              {leftPanel}
              <Box
                ml="48px"
                mr="auto"
                width={`calc(100% ${
                  leftPanel ? "- 15%" : ""
                } - ${drawerWidth})`}
                minHeight="100%"
              >
                <Box
                  flexDirection="column"
                  sx={{
                    padding: "53px",
                    backgroundColor: "#EFF1F1",
                    width: "100%",
                    height: "inherit",
                  }}
                >
                  <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                    {broadcrumbs.map((el, index) => (
                      <Typography
                        key={el}
                        color={
                          index === broadcrumbs.length - 1
                            ? "primary"
                            : "inherit"
                        }
                      >
                        {index === broadcrumbs.length - 1 ? (
                          <strong>{el}</strong>
                        ) : (
                          el
                        )}
                      </Typography>
                    ))}
                  </Breadcrumbs>
                  <Box display="flex" flexDirection="row">
                    <Typography fontSize="34px" fontStyle="normal">
                      {title}
                    </Typography>
                    {drawer ? drawer.button : null}
                  </Box>
                  <Typography>{subTitle}</Typography>
                  {children}
                </Box>
              </Box>
            </Box>
            {drawer ? drawer.drawerBody : null}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AccountLayout;
