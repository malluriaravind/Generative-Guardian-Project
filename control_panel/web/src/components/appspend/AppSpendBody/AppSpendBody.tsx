import {
  Box,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Button,
} from "@mui/material";
import { useRef, useState } from "react";
import {
  BarChart,
  YAxis,
  XAxis,
  Tooltip,
  CartesianGrid,
  Bar,
  ResponsiveContainer,
  Legend,
} from "recharts";

import DateRangeFilter from "../DataRangeFilter";
import {
  useGetModelStatsTimeQuery,
  useGetStatsQuery,
  useGetTotalStatsQuery,
} from "../../../api/stats";
import { StatsType } from "../../../types/stats";
import AppSpendTable from "../AppSpendTable";
import moment from "moment";
import { Range } from "react-date-range";
import { useAppDispatch } from "../../../store";
import { setDateRange } from "../../../slices/filter";
import PriceTypography from "../../PriceTypography";
import { round } from "lodash";
import "./AppSpendBody.scss";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { useGetUtilizationTagsQuery } from "../../../api/utilizationstats";

type AppSpendBodyProps = {
  currentStatsType: StatsType;
};

const AppSpendBody = ({ currentStatsType }: AppSpendBodyProps) => {
  // const [currentToggleButton, setCurrentToggleButton] = useState("thismonth");
  // const [currentDateFrame, setCurrentFrame] = useState();
  const dispatch = useAppDispatch();

  const today = new Date();
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [ranges, setRanges] = useState<Range[]>([
    {
      startDate: new Date(today.getFullYear(), today.getMonth(), 1),
      endDate: new Date(today.getFullYear(), today.getMonth() + 1, 1),
      key: "selection",
    },
  ]);
  const filterRange = {
    begin: ranges[0].startDate?.toISOString() ?? null,
    end: ranges[0].endDate?.toISOString() ?? null,
  };
  const statsData = useGetStatsQuery(
    {
      tag: selectedTag,
      type: currentStatsType,
      ...filterRange,
    },
    { refetchOnMountOrArgChange: true }
  );
  const { data: totalStats } = useGetTotalStatsQuery(
    { tag: selectedTag, ...filterRange },
    {
      refetchOnMountOrArgChange: true,
    }
  );
  const differenceTotalCost = totalStats
    ? totalStats?.cost.total - totalStats?.cost.previous_total
    : 0;

  const differenceForecastedBudget = totalStats
    ? totalStats?.budget.forecasted - totalStats?.cost.previous_total
    : 0;
  const totalTrend = !totalStats?.cost.previous_total
    ? 0
    : (totalStats?.budget.forecasted / totalStats?.cost.previous_total) * 100 -
      100;

  const statsGraph = useGetModelStatsTimeQuery(
    {
      type: currentStatsType,
      dateFrame: "day",
      tag: selectedTag,
      ...filterRange,
    },
    { refetchOnMountOrArgChange: true }
  );

  const { data: filterTags } = useGetUtilizationTagsQuery(
    {
      llm: "",
      app: "",
      ...filterRange,
    },
    {
      refetchOnMountOrArgChange: true,
    }
  );

  const [openCalendar, setOpenCalendar] = useState<boolean>(false);
  const filterRef = useRef<HTMLButtonElement>(null);
  dispatch(
    setDateRange({
      startDate: filterRange.begin,
      endDate: filterRange.end,
    })
  );
  return (
    <Box className="appspend" display="flex" flexDirection="column">
      <DateRangeFilter
        isOpen={openCalendar}
        setOpen={setOpenCalendar}
        ranges={ranges}
        setRanges={(ranges: Range[]) => {
          dispatch(
            setDateRange({
              startDate: ranges[0].startDate?.toISOString() ?? null,
              endDate: ranges[0].endDate?.toISOString() ?? null,
            })
          );
          setRanges(ranges);
        }}
        anchorEl={filterRef.current!}
      />
      <Grid container spacing={2} alignItems="center" sx={{ mt: 2 }}>
        <Grid item xs={6}>
          {filterTags && (
            <FormControl fullWidth className="grid-item">
              <InputLabel id="filter-tags-label">Tags</InputLabel>
              <Select
                labelId="filter-tags-label"
                value={selectedTag}
                label="Tags"
                onChange={(ev) => setSelectedTag(ev.target.value)}
              >
                <MenuItem value="">None</MenuItem>
                {filterTags
                  ?.filter((x) => x)
                  .map((tag: string) => (
                    <MenuItem key={tag} value={tag}>
                      {tag}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}
        </Grid>
        <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            color="primary" 
            variant="outlined" 
            ref={filterRef} 
            onClick={() => setOpenCalendar(true)}
            sx={{ 
              height: '56px',
              width: 'auto',
              minWidth: '250px',
              maxWidth: '300px',
              justifyContent: 'flex-start',
              padding: '8px 16px',
              backgroundColor: 'white',
              '&:hover': {
                backgroundColor: 'white',
              }
            }}
          >
            <CalendarMonthIcon sx={{ mr: 1, color: '#1976d2' }} />
            {moment(ranges[0].startDate).format("D-MMM-YYYY")} - {moment(ranges[0].endDate).format("D-MMM-YYYY")}
          </Button>
        </Grid>
      </Grid>
      <Box className="parent-box">
        <Paper className="child-paper">
          <Box className="child-box">
            <Typography color="#9E9E9E" fontSize="16px" fontWeight="600">
              Total cost
            </Typography>
            <Box className="child-container">
              <Box className="child-content">
                <Typography fontSize="24px" fontWeight="500 " mt={1}>
                  $
                </Typography>
                <PriceTypography
                  fontSize="34px"
                  fontWeight="500"
                  decimalCount={2}
                  value={totalStats?.cost.total}
                />
                <Chip
                  sx={{
                    marginTop: "10%",
                  }}
                  color={differenceTotalCost < 0 ? "success" : "error"}
                  size="small"
                  label={`${differenceTotalCost < 0 ? "▼ " : "▲"} $${Math.abs(
                    Math.round(differenceTotalCost * 100) / 100
                  )}`}
                />
              </Box>
            </Box>
          </Box>
        </Paper>
        {!totalStats?.budget.forecasted ? null : (
          <Paper className="child-paper">
            <Box className="child-box">
              <Typography color="#9E9E9E" fontSize="16px" fontWeight="600">
                Forecasted Budget
              </Typography>
              <Box className="child-container">
                <Box className="child-content">
                  <Typography fontSize="24px" fontWeight="500" mt={1}>
                    $
                  </Typography>
                  <PriceTypography
                    fontSize="34px"
                    fontWeight="500"
                    decimalCount={2}
                    value={totalStats?.budget.forecasted}
                  />
                  <Chip
                    sx={{
                      marginTop: "10%",
                    }}
                    color={differenceForecastedBudget < 0 ? "success" : "error"}
                    size="small"
                    label={`${
                      differenceForecastedBudget < 0 ? "▼" : "▲"
                    } $${Math.abs(
                      Math.round(differenceForecastedBudget * 100) / 100
                    )}`}
                  />
                </Box>
              </Box>
            </Box>
          </Paper>
        )}
        <Paper className="child-paper">
          <Box className="child-box">
            <Typography color="#9E9E9E" fontSize="16px" fontWeight="600">
              Monthly Budget
            </Typography>
            <Box display="flex" flexDirection="column" alignItems="flex-start">
              <Box className="child-container">
                <Typography
                  fontSize="34px"
                  fontWeight="500"
                  alignItems={"start"}
                  textAlign={"start"}
                >
                  {Math.round(
                    totalStats
                      ? ((totalStats?.cost.total / totalStats?.budget.total) *
                          10000) /
                          100
                      : 0
                  )}
                </Typography>
                <Typography fontSize="24px" fontWeight="500">
                  %
                </Typography>
              </Box>
              <Box
                width="100%"
                height="8px"
                alignItems={"start"}
                textAlign={"start"}
              >
                <LinearProgress
                  variant="determinate"
                  color="success"
                  value={Math.min(
                    totalStats
                      ? (totalStats?.cost.total / totalStats?.budget.total) *
                          100
                      : 0,
                    100
                  )}
                />
              </Box>
            </Box>
          </Box>
        </Paper>
        <Paper className="child-paper">
          <Box className="child-box">
            <Typography color="#9E9E9E" fontSize="16px" fontWeight="600">
              Trend
            </Typography>
            <Box className="child-container">
              <Box className="child-content">
                <Typography
                  fontSize="34px"
                  fontWeight="500"
                  color={
                    totalTrend === 0
                      ? "black"
                      : totalTrend < 0
                      ? "green"
                      : "red"
                  }
                >
                  {totalTrend === 0 ? "" : totalTrend < 0 ? "▼" : "▲"}
                  {Math.abs(round(totalTrend, 2))}%
                </Typography>
              </Box>
              {/* <Chip color="error" size="small" label="▼ $701" /> */}
            </Box>
          </Box>
        </Paper>
      </Box>
      <Box
        display="flex"
        flexDirection="column"
        sx={{ background: "white" }}
        borderRadius="5px"
      >
        <Box m="24px">
          <Typography fontSize="22px" fontWeight="600">
            {/* {currentStatsType == "app"
              ? "LLM Spend by App"
              : "LLM Spend by Provider"} */}
          </Typography>
        </Box>
        {statsData.isLoading ? (
          <LinearProgress color="primary" />
        ) : (
          <ResponsiveContainer
            width="90%"
            style={{ margin: "auto" }}
            height={500}
          >
            <BarChart
              data={statsGraph.data?.data}
              barSize={15}
              layout="horizontal"
            >
              <YAxis type="number" />
              <XAxis type="category" dataKey="name" />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Legend />
              {statsGraph.data?.objects?.map(({ _id, name, color }) => (
                <Bar
                  key={_id}
                  textDecoration="none"
                  name={name}
                  dataKey={(val) => val["stacks"][name] || 0}
                  stackId="a"
                  fill={color}
                />
              ))}{" "}
              {/*
              <Bar
                name="Fitness Level 3"
                dataKey="amt"
                stackId="a"
                fill="#589241"
              /> */}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
      <Box className="AppSpendBody_table_items">
        {statsData.isLoading || !statsData.data ? null : (
          <AppSpendTable items={statsData.data} type={currentStatsType} />
        )}
      </Box>
    </Box>
  );
};

export default AppSpendBody;
