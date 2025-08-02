import { Tabs, Tab } from "@mui/material";
import AccountLayout from "../layouts/account/AccountLayout";
import { useState } from "react";
import { Box } from "@mui/system";
import AppSpendBody from "../components/appspend/AppSpendBody/AppSpendBody";
import { StatsType } from "../types/stats";

const AppspendPage = () => {
  const [currentStatsType, setCurrentStatsType] = useState<StatsType>("app");
  return (
    <AccountLayout
      title="Spend"
      subTitle=""
      drawer={null}
      leftPanel={null}
      broadcrumbs={["Home", "Spend"]}
    >
      <Box sx={{ borderBottom: 1, borderColor: "divider" }} marginTop="16px">
        <Tabs
          value={currentStatsType}
          onChange={(_, newValue) => {
            setCurrentStatsType(newValue);
          }}
          orientation="horizontal"
        >
          <Tab label="APPS" value="app" id="simple-tab-1"></Tab>

          <Tab label="PROVIDERS" value="llm" id="simple-tab-2" />
        </Tabs>
      </Box>
      <AppSpendBody currentStatsType={currentStatsType} />
    </AccountLayout>
  );
};

export default AppspendPage;
