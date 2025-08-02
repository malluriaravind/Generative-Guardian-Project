import {
  Box,
  Collapse,
  IconButton,
  LinearProgress,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { RiDeleteBin6Line } from "react-icons/ri";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { AlertResponse } from "../../../types/alert";
import { useGetAlertStatsQuery } from "../../../api/alert";
import moment from "moment";
import ArrowedNumber from "../../ArrowedNumber";
import PriceTypography from "../../PriceTypography";
import "./AlertTableRow.css";
import ArrowDropDown from "@mui/icons-material/ArrowDropDown";
import {
  AlertArrow,
  AlertEditIcon,
  AlertTableCell,
  AlertTypography,
} from "./AlertPage";

const columns: GridColDef[] = [
  {
    field: "period",
    headerName: "Month",
    minWidth: 120,
    headerAlign: "right",
    align: "right",
  },
  {
    field: "actual",
    headerName: "Actual",
    minWidth: 120,
    flex: 1,
    headerAlign: "right",
    align: "right",
    valueFormatter: (params) => `$${params.value}`,
  },
  {
    field: "budget",
    headerName: "Budgeted",
    minWidth: 120,
    headerAlign: "right",
    align: "right",
    flex: 1,
    renderCell: ({ value }) => (
      <PriceTypography
        value={value}
        decimalCount={2}
        prefix="$"
        fontSize="14px"
      />
    ),
  },
  {
    field: "budgetedVarianceUSD",
    headerName: "Budgeted Variance(USD)",
    minWidth: 175,
    headerAlign: "right",
    align: "right",
    flex: 1,
    renderCell: ({ value }) => (
      <PriceTypography
        value={value}
        decimalCount={2}
        prefix="$"
        fontSize="14px"
      />
    ),
  },
  {
    field: "budgetedVariancePercent",
    headerName: "Budgeted Variance(%)",
    minWidth: 175,
    flex: 1,
    headerAlign: "right",
    align: "right",
    valueFormatter: (params) =>
      params.value === null ? "N/A" : `${params.value}%`,
  },
];

type AlertTableRowProps = {
  item: AlertResponse;
  isSelected: boolean;
  setCurrentAlertId: (value: string) => void;
  setCurrentAlert: (value: AlertResponse) => void;
  setEditDrawer: (value: boolean) => void;
  setDeleteDialogOpened: (value: boolean) => void;
};

const AlertTableRow = ({
  item,
  isSelected,
  setCurrentAlert,
  setCurrentAlertId,
  setEditDrawer,
  setDeleteDialogOpened,
}: AlertTableRowProps) => {
  const forecasted: string = "N/A";
  const [isPanelOpened, setOpenPanel] = useState<boolean>(isSelected);
  const alertStats = useGetAlertStatsQuery(
    { id: item._id },
    { refetchOnMountOrArgChange: true }
  );

  const rows = alertStats.data?.map((item, index) => ({
    id: index,
    period: item.period,
    actual: item.actual,
    budget: item.budget,
    budgetedVarianceUSD: item.budget - item.actual,
    budgetedVariancePercent: !item.budget
      ? null
      : Math.round((item.actual / item.budget) * 10000) / 100,
  }));
  const graphData = alertStats.data?.slice().reverse();

  const rowRef = useRef<HTMLTableRowElement>();
  useEffect(() => {
    if (isSelected) {
      setTimeout(() => {
        rowRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 1000);
    }
  }, [isSelected]);

  const [isActive, setActive] = useState(false);

  const handleCellClick = () => {
    setActive(!isActive);
  };

  return (
    <>
      <TableRow
        ref={rowRef}
        sx={{
          cursor: "pointer",
          backgroundColor: isActive ? "#d5dfed" : "inherit",
        }}
      >
        <TableCell onClick={handleCellClick} style={AlertTableCell}>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpenPanel(!isPanelOpened)}
          >
            {isPanelOpened ? (
              <ArrowDropDown style={AlertArrow} />
            ) : (
              <ArrowRightIcon style={AlertArrow} />
            )}
          </IconButton>
          {item.name}
        </TableCell>
        <TableCell>
          <Typography
            fontSize="14px"
            fontWeight="400"
            color={item.threshold == "Ok" ? "#4CAF50" : "#D32F2F"}
          >
            ● {item.threshold}
          </Typography>
        </TableCell>
        <TableCell style={AlertTableCell} align="right">
          <PriceTypography
            fontSize="14px"
            prefix="$"
            value={item.budget}
            decimalCount={2}
          />
        </TableCell>

        <TableCell align="right" style={AlertTableCell}>
          {(
            <ArrowedNumber
              fontSize="14px"
              justifyContent="end"
              trend={
                item.forecasted_budget === null
                  ? "empty"
                  : item.forecasted_budget === item.budget
                  ? "along"
                  : item.forecasted_budget > item.budget
                  ? "up"
                  : "down"
              }
              value={
                item.forecasted_budget === null ? (
                  "N/A"
                ) : (
                  <PriceTypography
                    prefix="$"
                    fontSize="14px"
                    value={item.forecasted_budget}
                    decimalCount={2}
                  />
                )
              }
            />
          ) || forecasted}
        </TableCell>
        {/* Calculate forecasted based on graph */}
        {/* <TableCell>{(forecasted / item.budget) * 100}%</TableCell> */}
        <TableCell align="right">
          {!item.budget || item.forecasted_budget === 0
            ? "N/A"
            : Math.round((item.forecasted_budget ?? 0 / item.budget) * 100) +
              "%"}
        </TableCell>
        <TableCell align="center" style={AlertTableCell}>
          <IconButton
            onClick={() => {
              setCurrentAlert(item);
              setEditDrawer(true);
            }}
          >
            <EditOutlinedIcon style={AlertEditIcon} />
          </IconButton>
          <IconButton
            onClick={() => {
              setCurrentAlertId(item._id);
              setDeleteDialogOpened(true);
            }}
          >
            <RiDeleteBin6Line
              style={{
                color: "#2196f3",
                fontSize: 20,
              }}
            />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={isPanelOpened} timeout="auto" unmountOnExit>
            <Box p="16px" display="flex" flexDirection="column">
              <Typography fontSize="14" fontWeight="400">
                Start Date - {moment(item.created_at).format("D-MMM-YYYY")}
              </Typography>
              <Typography fontSize="14px" p="24px" fontWeight="600">
                Spend($)
              </Typography>
              <Box width="100%" display="flex" justifyContent="center">
                {alertStats.isLoading ? (
                  <LinearProgress color="primary" />
                ) : (
                  <ResponsiveContainer width="95%" height={400}>
                    <BarChart data={graphData} barSize={20}>
                      <CartesianGrid strokeDasharray="7" vertical={false} />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="actual" fill="#3949AB" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
              <Typography style={AlertTypography}>Spend History</Typography>
              {typeof rows === "undefined" ? (
                <LinearProgress />
              ) : (
                <DataGrid hideFooter columns={columns} rows={rows} />
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default AlertTableRow;
