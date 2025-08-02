// import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import PolicyIcon from "@mui/icons-material/Policy";
import DeviceHubIcon from "@mui/icons-material/DeviceHub";
import AppsIcon from "@mui/icons-material/Apps";
import PsychologyIcon from "@mui/icons-material/Psychology";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SecurityIcon from "@mui/icons-material/Security";
import GroupIcon from "@mui/icons-material/Group";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import { SHOW_OVERVIEW_PAGE } from "../../constants";
// You can import more icons as needed

export type SidebarItemProps = {
  text: string;
  link: string;
  isChild: boolean;
  icon: React.ReactNode;
  namespace: string | undefined;
};

export const topSidebarItems: SidebarItemProps[] = [
  ...(SHOW_OVERVIEW_PAGE
    ? [
        {
          text: "OVERVIEW",
          link: "/overview",
          isChild: false,
          icon: <QueryStatsIcon color="primary" />,
          namespace: "/overview/",
        },
      ]
    : []),
  {
    text: "SPEND",
    link: "/appspend",
    isChild: false,
    icon: <DashboardIcon color="primary" />,
    namespace: "/stats/",
  },
  {
    text: "BUDGET",
    link: "/budget",
    isChild: false,
    icon: <MonetizationOnIcon color="primary" />,
    namespace: "/budget/",
  },
  {
    text: "USAGE",
    link: "/usage",
    isChild: false,
    icon: <ShowChartIcon color="primary" />,
    namespace: "/stats/",
  },
  {
    text: "POLICIES",
    link: "/policies",
    isChild: false,
    icon: <PolicyIcon color="primary" />,
    namespace: "/policies/",
  },
  {
    text: "MODEL POOLS",
    link: "/modelpool",
    isChild: false,
    icon: <DeviceHubIcon color="primary" />,
    namespace: "/modelpool/",
  },
  {
    text: "APPLICATIONS",
    link: "/apikey",
    isChild: false,
    icon: <AppsIcon color="primary" />,
    namespace: "/apikey/",
  },
  {
    text: "PROVIDERS",
    link: "/llmconfig",
    isChild: false,
    icon: <PsychologyIcon color="primary" />,
    namespace: "/llm/",
  },
];

export const middleSidebarItems: SidebarItemProps[] = [
  {
    text: "CONFIGURATION",
    link: "/settings/configuration",
    isChild: false,
    icon: <SettingsIcon color="primary" />,
    namespace: "/cfg/",
  },
  {
    text: "PROFILE",
    link: "/settings/profile",
    isChild: false,
    icon: <AccountCircleIcon color="primary" />,
    namespace: undefined,
  },
  {
    text: "SECURITY",
    link: "/settings/security",
    isChild: false,
    icon: <SecurityIcon color="primary" />,
    namespace: undefined,
  },
  {
    text: "ACCOUNTS",
    link: "/settings/accounts",
    isChild: false,
    icon: <GroupIcon color="primary" />,
    namespace: "/accounts/",
  },
  {
    text: "ROLES",
    link: "/settings/roles",
    isChild: false,
    icon: <ManageAccountsIcon color="primary" />,
    namespace: '/rbac/',
  },
];

export const bottomSidebarItems: SidebarItemProps[] = [
  /*{
    icon: <HeadsetMicOutlinedIcon />,
    text: "SUPPORT",
    link: "",
    isChild: false,
  },
  */
];
