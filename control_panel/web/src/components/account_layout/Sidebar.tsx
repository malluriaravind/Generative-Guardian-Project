import {
  Box,
  Divider,
  Drawer,
  List,
  ListItem,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { Logo } from "../../icons";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import React, { useEffect } from "react";
import { secondary } from "../../colors";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "../../store";
import { useGetVersionsQuery } from "../../api/maintenance";
import { middleSidebarItems, SidebarItemProps, topSidebarItems } from "./SidebarItems";
import SidebarLists from "./SidebarLists";
import { useLogoutMutation } from "../../api/auth";
import { drawerWidth } from "../../constants";
import HeartBeatsPopup from "./components/HeartBeatsPopup";
import { useGetMeQuery } from "../../api/user";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [logout] = useLogoutMutation();
  const {data: user} = useGetMeQuery()
  const { data: versionData, isLoading: isVersionLoading } =
    useGetVersionsQuery(undefined, {
      refetchOnMountOrArgChange: true,
    });
  const [selectedButtonIndex, setSelectedButtonIndex] = React.useState<
    [number, number] | null
  >(null);
  const { firstName, lastName, is_root } = useAppSelector((state) => state.user);

  const getSideBarItems = (items: SidebarItemProps[]) => {
    if (typeof user === "undefined") {
      return [];
    }
    if(user.is_root) {
      return items;
    }
    return items.filter(({namespace}) => namespace === undefined || user.available_api_namespaces.indexOf(namespace) > -1);
  };

  const handleButtonClick = (
    link: string,
    index: number,
    listIndex: number
  ) => {
    navigate(link);
    setSelectedButtonIndex([index, listIndex]);
  };

  const sideBar = {
    top: getSideBarItems(topSidebarItems),
    middle: getSideBarItems(middleSidebarItems),
  };

  useEffect(() => {
    const currentRoute = location.pathname;
    let listIndex = 0;
    let foundIndex = sideBar.top.findIndex(
      (item) => item.link === currentRoute
    );
    if (foundIndex === -1) {
      listIndex = 1;
      foundIndex = sideBar.middle.findIndex(
        (item) => item.link === currentRoute
      );
    }
    setSelectedButtonIndex(foundIndex !== -1 ? [foundIndex, listIndex] : null);
  }, [location]);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" },
      }}
    >
      <Toolbar>{Logo}</Toolbar>
      <Box display="flex" flexDirection="column" height="100%" px="18px">
        <List>
          <ListItem>
            <Typography
              color={secondary[80]}
              fontSize="12px"
              fontWeight="400"
              fontStyle="normal"
            >
              Monitoring
            </Typography>
          </ListItem>
          {sideBar.top.map((item, index) => (
            <SidebarLists
              key={item.text}
              {...item}
              selected={
                selectedButtonIndex != null &&
                index === selectedButtonIndex[0] &&
                selectedButtonIndex[1] === 0
              }
              onClick={() => handleButtonClick(item.link, index, 0)}
            />
          ))}
          <ListItem>
            <Box>
              <Typography
                color={secondary[80]}
                fontSize="12px"
                fontWeight="400"
                fontStyle="normal"
              >
                Settings
              </Typography>
            </Box>
          </ListItem>
          {sideBar.middle.map((item, index) => (
            <SidebarLists
              key={item.text}
              {...item}
              selected={
                selectedButtonIndex != null &&
                index === selectedButtonIndex[0] &&
                selectedButtonIndex[1] === 1
              }
              onClick={() => handleButtonClick(item.link, index, 1)}
            />
          ))}
        </List>

        <Box marginTop="auto" flexDirection="column">
          {isVersionLoading || !versionData ? null : (
            <Stack gap={2}>
              <Typography fontSize="14px" color="gray">
                Aggregator version:{" "}
                {versionData.find((el) => el.appname === "aggregator")
                  ?.reprversion || "undefined"}
              </Typography>
              <Box>
                <Typography fontSize="14px" color="gray">
                  Control panel
                </Typography>
                <Typography fontSize="12px" color="gray" ml="10px">
                  Backend version:{" "}
                  {versionData.find((el) => el.appname === "control_panel")
                    ?.reprversion || "undefined"}
                </Typography>
                <Typography fontSize="12px" color="gray" ml="10px">
                  Frontend version: {import.meta.env.WEB_VERSION}
                </Typography>
              </Box>
              <HeartBeatsPopup versions={versionData} />
            </Stack>
          )}
        </Box>
        <Box marginTop="15px">
          <Divider />
          <Box
            display="flex"
            flexDirection="row"
            pt="12px"
            justifyContent="space-between"
            alignItems="center"
            marginBottom="16px"
          >
            <Box px="12px">
              <AccountCircleOutlinedIcon fontSize="large" />
            </Box>
            <Box display="flex" flexDirection="column" width="100px">
              <Typography fontSize="12px" noWrap>
                {firstName} {lastName}
              </Typography>
              {is_root ? <Typography fontSize="10px">Admin</Typography>: null}
            </Box>
            <Box>
              <LogoutIcon
                style={{ cursor: "pointer" }}
                onClick={async () => {
                  await logout();
                  navigate("/");
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};
export default Sidebar;
