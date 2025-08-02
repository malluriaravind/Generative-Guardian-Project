import DashboardCard from "../../../shared/components/dashboard-card";
import WarningIcon from "@mui/icons-material/WarningAmber";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import ShieldIcon from "@mui/icons-material/Shield";
import { Stack } from "@mui/material";
import { useGetStatsCountQuery } from "../../../../api/log_viewer";
import { getISOLocalString } from "../../../../utils/date";
import { useGetUtilizationTotalStatsQuery } from "../../../../api/utilizationstats";

const Cards = () => {
  const today = getISOLocalString();
  const yesterday = getISOLocalString(-1, 'd');
  const beforeYesterday = getISOLocalString(-2, 'd');
  const lastWeek = getISOLocalString(-1, 'w');
  const {data: totalStats} = useGetUtilizationTotalStatsQuery({begin: yesterday, end: today});
  const {data: lastWeekTotalStats} = useGetUtilizationTotalStatsQuery({begin: lastWeek, end: today});
  const {data: todayApiCount} = useGetStatsCountQuery({type: 'prompt', begin: yesterday, end: today});
  const {data: yesterdayApiCount=1} = useGetStatsCountQuery({type: 'prompt', begin: beforeYesterday, end: yesterday});
  const lastWeekStat = totalStats?.reponse_time?.average_ms - lastWeekTotalStats?.reponse_time?.average_ms;
  return (
    <Stack
      direction="row"
      gap="1rem"
      flexWrap="wrap"
      justifyContent="space-between"
      marginY="1rem"
    >
      {/* <DashboardCard
        title="Compliance Score"
        icon={<WarningIcon color="warning" />}
        content="82%"
        subtext=""
        highlightColor="#fdd835"
        useBar
        barPercentageProgress={82}
      /> */}
      {typeof todayApiCount !== 'undefined' ?
      <DashboardCard
        title="API Calls (24h)"
        icon={<TrendingUpIcon color="primary" />}
        content={todayApiCount}
        subtext={`${Math.floor(todayApiCount / yesterdayApiCount * 100)}% from yesterday`}
        subtextColor="green"
      />: null}
      {typeof totalStats !== 'undefined' ? 
      (<DashboardCard
        title="Avg Response Time"
        icon={<FlashOnIcon color="primary" />}
        content={`${totalStats?.reponse_time?.average_ms} ms`}
        subtext={`${lastWeekStat}ms from last week`}
        subtextColor={ lastWeekStat < 0 ? "green": "red" }
      />) : null}
      {typeof totalStats !== 'undefined' ? 
      <DashboardCard
        title="Security Incidents"
        icon={<ShieldIcon color={totalStats?.policies?.total > 0 ? "error" : "success"} />}
        content={totalStats?.policies?.total}
        subtext={totalStats?.policies?.total > 0 ? "Policy intrusion detected": "No policy problems"}
        subtextColor={totalStats?.policies?.total > 0 ? "red": "green"}
      />: null }
    </Stack>
  );
};

export default Cards;
