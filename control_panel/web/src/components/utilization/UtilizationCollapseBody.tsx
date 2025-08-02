import { Box, LinearProgress } from "@mui/material";
import { useGetModelStatsQuery } from "../../api/stats";
import { StatsType } from "../../types/stats";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useAppSelector } from "../../store";
import PriceTypography from "../PriceTypography";
import ArrowedNumber from "../ArrowedNumber";
import { useState } from "react";

type UtilizationTableCollapseBody = {
  id: string;
  type: StatsType;
};
const UtilizationTableCollapseBody = ({
  type,
  id,
}: UtilizationTableCollapseBody) => {
  const { dateRange } = useAppSelector((state) => state.filter);
  const { data, isLoading } = useGetModelStatsQuery(
    {
      type,
      id,
      begin: dateRange?.startDate ?? null,
      end: dateRange?.endDate ?? null,
    },
    { refetchOnMountOrArgChange: true }
  );

  const [sortModel, setSortModel] = useState([
    { field: "name", sort: "desc" },
  ]);

  if (isLoading || !data) {
    return <LinearProgress color="primary" />;
  }

  const columns: GridColDef[] = [
    { field: "name", headerName: "Model", flex: 3 },
    {
      field: "tokens",
      headerName: "Tokens Used",
      headerAlign: "center",
      align: "center",
      flex: 1.2,

      renderCell: ({ value }) => (
        <PriceTypography fontSize="14px" value={value} decimalCount={2} />
      ),
    },
    {
      field: "total",
      headerName: "Total",
      headerAlign: "center",
      align: "center",
      flex: 1.2,
      renderCell: ({ value }) => (
        <PriceTypography
          fontSize="14px"
          prefix="$"
          value={value}
          decimalCount={2}
        />
      ),
    },
    {
      field: "costTrend",
      headerName: "Cost Trend",
      flex: 1.2,
      renderCell: ({ value }) =>
        !value ? (
          "N/A"
        ) : (
          <ArrowedNumber
            trend={value < 0 ? "down" : "up"}
            justifyContent="end"
            value={
              <PriceTypography
                fontSize="14px"
                prefix="$"
                decimalCount={2}
                value={Math.abs(value)}
              />
            }
          />
        ),
      headerAlign: "right",
      align: "right",
    },
  ];
  const rows = data.map((item, index) => ({
    id: index,
    name: item.model,
    tokens: item.total_tokens,
    total: item.total_cost,
    costTrend: item.cost_trend,
  }));
  return (
    <Box p="16px">
      <DataGrid
        hideFooter
        columns={columns}
        rows={rows}
        rowHeight={40}
        columnHeaderHeight={40}
        columnBuffer={5}
        headerHeight={40}
        rowBuffer={5}
        sortModel={sortModel}
        onSortModelChange={(model) => setSortModel(model)}
      />
    </Box>
  );
};

export default UtilizationTableCollapseBody;
