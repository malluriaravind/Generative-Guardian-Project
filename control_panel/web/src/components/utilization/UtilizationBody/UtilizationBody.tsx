import { useEffect, useRef, useState } from "react";
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  YAxis,
  XAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import moment from "moment";
import { Range } from "react-date-range";
import { useAppDispatch } from "../../../store";
import { setDateRange } from "../../../slices/filter";
import {
  calendarIconStyles,
  filtersGridItem,
  UtilizationTypography,
} from "../../../theme";
import DateRangeFilter from "../../appspend/DataRangeFilter";
import UtilizationTable from "../UtilizationTable";
import GraphCustomLegend from "../GraphCustomLegend";
import PriceTypography2 from "../PriceTypography2";
import {
  useGetAppListQuery,
  useGetProviderListQuery,
  useGetUtilizationModelStatsTimeQuery,
  useGetUtilizationStatsQuery,
  useGetUtilizationTagsQuery,
  useGetUtilizationTotalStatsQuery,
} from "../../../api/utilizationstats";
import "./UtilizationBody.scss";
import {
  ChartLineSettings,
  UtilizationFilters,
} from "../../../types/utilization";
import React from "react";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { defaultUtilizationFilters } from "./constants";
import LogViewerTable from "../../log_viewer/body/LogViewerTable";
import { resetLogViewer, setFilter } from "../../../slices/log_viewer";

const UtilizationBody = () => {
  const [utilizationFilters, SetUtilizationFilters] =
    useState<UtilizationFilters>(defaultUtilizationFilters);
  const [isDebugLogsShown, setShowDebugLogs] = useState(false);

  const dispatch = useAppDispatch();
  const today = new Date();
  const [ranges, setRanges] = useState<Range[]>([
    {
      startDate: new Date(today.getFullYear(), today.getMonth(), 1),
      endDate: new Date(today.getFullYear(), today.getMonth() + 1, 1),
      key: "selection",
    },
  ]);
  const [visibleLines, setVisibleLines] = useState<ChartLineSettings>({
    avg_response_time: false,
    errors: false,
    avg_total_tokens: false,
    prompt_tokens: true,
    completion_tokens: false,
  });

  const filterRange = {
    begin: ranges[0].startDate?.toISOString() ?? null,
    end: ranges[0].endDate?.toISOString() ?? null,
  };
  const apps = useGetAppListQuery(
    {
      ...utilizationFilters,
      ...filterRange,
    },
    {
      refetchOnMountOrArgChange: true,
    }
  );
  const providers = useGetProviderListQuery(
    {
      ...utilizationFilters,
      ...filterRange,
    },
    {
      refetchOnMountOrArgChange: true,
    }
  );
  const { data: filterTags } = useGetUtilizationTagsQuery(
    {
      ...utilizationFilters,
      ...filterRange,
    },
    {
      refetchOnMountOrArgChange: true,
    }
  );
  const statsData = useGetUtilizationStatsQuery(
    {
      ...filterRange,
      ...utilizationFilters,
    },
    { refetchOnMountOrArgChange: true }
  );
  const { data: totalStats } = useGetUtilizationTotalStatsQuery(
    {
      ...filterRange,
      ...utilizationFilters,
    },
    {
      refetchOnMountOrArgChange: true,
    }
  );
  const statsGraph = useGetUtilizationModelStatsTimeQuery(
    {
      dateFrame: "day",
      ...utilizationFilters,
      ...filterRange,
    },
    { refetchOnMountOrArgChange: true }
  );
  const [openCalendar, setOpenCalendar] = useState<boolean>(false);
  const filterRef = useRef<HTMLButtonElement>(null);

  dispatch(
    setDateRange({
      startDate: filterRange.begin,
      endDate: filterRange.end,
    })
  );

  const handleLegendClick = (key) => {
    setVisibleLines((prevState) => ({
      ...Object.fromEntries(Object.keys(prevState).map((k) => [k, k === key])), // Set all lines to false except the clicked one
      [key]: true,
    }));
  };

  useEffect(() => {
    if (!isDebugLogsShown) {
      return;
    }

    dispatch(
      setFilter({
        ...filterRange,
        ...utilizationFilters,
        prompts: false,
        responses: false,
      })
    );
    return () => dispatch(resetLogViewer());
  }, [isDebugLogsShown, filterRange, utilizationFilters]);

  return (
    <Box className="utilization" display="flex" flexDirection="column">
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
      <Grid container spacing={2}>
        <Grid item {...filtersGridItem}>
          <FormControl fullWidth className="grid-item">
            <InputLabel id="filter-application-label">Applications</InputLabel>
            <Select
              labelId="filter-application-label"
              value={utilizationFilters.app}
              label="Applications"
              onChange={(ev) =>
                SetUtilizationFilters((prev) => ({
                  ...prev,
                  app: ev.target.value,
                }))
              }
            >
              <MenuItem value="">None</MenuItem>
              {apps.data?.map(({ name, _id }) => (
                <MenuItem key={_id} value={_id}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth className="grid-item">
            <InputLabel id="filter-providers-label">Providers</InputLabel>
            <Select
              labelId="filter-providers-label"
              value={utilizationFilters.llm}
              label="Providers"
              onChange={(ev) =>
                SetUtilizationFilters((prev) => ({
                  ...prev,
                  llm: ev.target.value,
                }))
              }
            >
              <MenuItem value="">None</MenuItem>
              {providers.data?.map(({ name, _id }) => (
                <MenuItem key={_id} value={_id}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {filterTags && (
            <FormControl fullWidth className="grid-item">
              <InputLabel id="filter-tags-label">Tags</InputLabel>
              <Select
                labelId="filter-tags-label"
                value={utilizationFilters.tag}
                label="Tags"
                onChange={(ev) =>
                  SetUtilizationFilters((prev) => ({
                    ...prev,
                    tag: ev.target.value,
                  }))
                }
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
        <Grid item {...filtersGridItem}>
          <FormControlLabel
            control={
              <Checkbox
                value={isDebugLogsShown}
                onChange={() => setShowDebugLogs((prev) => !prev)}
              />
            }
            label="Debug logs"
          />
          <TextField
            value={
              typeof ranges[0].startDate !== "undefined"
                ? `${moment(ranges[0].startDate).format(
                    "D-MMM-YYYY"
                  )} To ${moment(ranges[0].endDate).format("D-MMM-YYYY")}`
                : ""
            }
            variant="standard"
            className="grid-item"
            contentEditable={false}
          />
          <IconButton
            onClick={() => {
              setOpenCalendar((prevOpen) => !prevOpen);
            }}
            sx={{ ...calendarIconStyles }}
            ref={filterRef}
          >
            <CalendarMonthIcon className="white-icon" />
          </IconButton>
        </Grid>
      </Grid>
      <Box className="parent-box">
        <Paper className="child-paper">
          <Box className="child-box">
            <Typography style={UtilizationTypography}>
              Tokens sent / Received
            </Typography>
            <Box className="child-container">
              <Box className="child-content">
                <PriceTypography2
                  fontSize="34px"
                  fontWeight="500"
                  decimalCount={0}
                  value={totalStats?.tokens.prompt}
                />
                <Typography
                  variant="h4"
                  fontWeight={500}
                  align="center"
                  textAlign={"center"}
                  mt={0.6}
                >
                  /
                </Typography>
                <PriceTypography2
                  fontSize="34px"
                  fontWeight="500"
                  decimalCount={0}
                  value={totalStats?.tokens.completion}
                />
              </Box>
            </Box>
          </Box>
        </Paper>
        <Paper className="child-paper">
          <Box className="child-box">
            <Typography style={UtilizationTypography}>
              Avg Tokens / Request
            </Typography>
            <Box className="child-container">
              <Box className="child-content">
                <PriceTypography2
                  fontSize="34px"
                  fontWeight="500"
                  value={totalStats?.tokens.average}
                />
              </Box>
            </Box>
          </Box>
        </Paper>
        <Paper className="child-paper">
          <Box className="child-box">
            <Typography style={UtilizationTypography}>
              Response Time(MS)
            </Typography>
            <Box className="child-container">
              <Box className="child-content">
                <PriceTypography2
                  fontSize="34px"
                  fontWeight="500"
                  decimalCount={0}
                  value={totalStats?.reponse_time.average_ms}
                />
                <Typography
                  variant="caption"
                  fontSize="32px"
                  fontWeight="300"
                  ml={1}
                >
                  avg
                </Typography>
              </Box>
              <Typography
                mt={0.6}
                fontSize={"34px"}
                align="center"
                textAlign={"center"}
              >
                /
              </Typography>
              <Box className="child-content">
                <PriceTypography2
                  fontSize="34px"
                  fontWeight="500"
                  decimalCount={0}
                  value={totalStats?.reponse_time.peak_ms}
                ></PriceTypography2>
                <Typography
                  variant="caption"
                  fontSize="32px"
                  fontWeight="300"
                  ml={1}
                >
                  peak
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
        <Paper className="child-paper">
          <Box className="child-box">
            <Typography style={UtilizationTypography}>
              API Warning / Errors
            </Typography>
            <Box className="child-container">
              <Box className="child-content">
                <PriceTypography2
                  fontSize="34px"
                  fontWeight="500"
                  decimalCount={0}
                  value={totalStats?.warnings}
                />
                <Typography
                  mt={0.6}
                  variant="h4"
                  fontWeight={500}
                  align="center"
                  textAlign={"center"}
                >
                  /
                </Typography>
                <PriceTypography2
                  fontSize="34px"
                  fontWeight="500"
                  decimalCount={0}
                  value={totalStats?.errors}
                />
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
      <Stack sx={{ background: "white" }} borderRadius="5px">
        <Box m="24px">
          <Typography fontSize="22px" fontWeight="600">
            {/* LLM Spend by {displayName} */}
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
            <LineChart width={600} height={300} data={statsGraph.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Legend
                content={
                  <GraphCustomLegend
                    payload={statsGraph.data}
                    visibleLines={visibleLines}
                    handleLegendClick={handleLegendClick}
                  />
                }
              />
              <Tooltip
                labelFormatter={(value) => moment(value).format("D-MMM-YYYY")}
              />
              {statsGraph.currentData?.objects?.map(
                ({
                  date,
                  avg_response_time,
                  avg_total_tokens,
                  prompt_tokens,
                  completion_tokens,
                  errors,
                }) => (
                  <React.Fragment key={date}>
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey={avg_response_time || 0}
                      stroke="#BFAB25"
                      hide={!visibleLines.avg_response_time}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey={errors || 0}
                      name="errors"
                      stroke="#A20252"
                      hide={!visibleLines.errors}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey={avg_total_tokens || 0}
                      stroke="blue"
                      hide={!visibleLines.avg_total_tokens}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey={prompt_tokens || 0}
                      stroke="orange"
                      hide={!visibleLines.prompt_tokens}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey={completion_tokens || 0}
                      stroke="green"
                      hide={!visibleLines.completion_tokens}
                    />
                  </React.Fragment>
                )
              )}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="prompt_tokens"
                name="Prompt Tokens"
                stroke="#039DB5"
                hide={!visibleLines.prompt_tokens}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="completion_tokens"
                name="Completion Tokens"
                stroke="#022c32"
                hide={!visibleLines.completion_tokens}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avg_total_tokens"
                name="Tokens/request"
                stroke="#8884d8"
                hide={!visibleLines.avg_total_tokens}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avg_response_time"
                name="Response Time/request"
                stroke="#BFAB25"
                hide={!visibleLines.avg_response_time}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="errors"
                name="Errors"
                stroke="#A20252"
                hide={!visibleLines.errors}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Stack>
      <Box className="AppSpendBody_table_items">
        {isDebugLogsShown ? (
          <LogViewerTable isDebugLog={isDebugLogsShown} />
        ) : statsData.isLoading || !statsData.data ? null : (
          <UtilizationTable items={statsData.data} />
        )}
      </Box>
    </Box>
  );
};

export default UtilizationBody;
