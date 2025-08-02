import {
  GridColDef,
  DataGrid,
  GridActionsCellItem,
  GridRowParams,
} from "@mui/x-data-grid";
import BeenhereOutlinedIcon from "@mui/icons-material/BeenhereOutlined";
import { useCheckTriggerMutation } from "../../../api/triggered";
import { TriggeredResponse } from "../../../types/triggered";
import { Typography } from "@mui/material";
import styles from "./AlertNotification.module.scss";
import { round } from "lodash";
import PriceTypography from "../../PriceTypography";

type AlertNotificationProps = {
  data: TriggeredResponse[];
  onRowClick: (params: GridRowParams) => void;
};

const AlertNotification = ({ data, onRowClick }: AlertNotificationProps) => {
  const [checkTrigger] = useCheckTriggerMutation();
  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      minWidth: 200,
      flex: 1.5,
      headerAlign: "left",
      align: "left",
    },
    {
      field: "limit",
      headerName: "Limit",
      renderCell: ({ value }) => (
        <PriceTypography
          prefix="$"
          fontSize="14px"
          value={value}
          decimalCount={2}
        />
      ),
      flex: 1,
      headerAlign: "right",
      align: "right",
    },
    {
      field: "amountUsed",
      headerName: "Amount Used",
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: ({ value }) => (
        <PriceTypography
          prefix="$"
          fontSize="14px"
          value={value}
          decimalCount={2}
        />
      ),
    },
    {
      field: "threshold",
      headerName: "Threshold",
      renderCell: ({ value, row }) => (
        <Typography
          fontSize="14px"
          fontWeight="400"
          color={row.checked ? "gray" : value === "Ok" ? "green" : "red"}
        >
          {`● ${value}`}
        </Typography>
      ),
      flex: 1,
      headerAlign: "right",
      align: "right",
    },
    {
      field: "amountvsthreshould",
      headerName: "Amount vs. Threshold",
      minWidth: 200,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: ({ value }) => (
        <Typography
          fontSize="14px"
          color={round(value, 2) == 0 ? "black" : value < 0 ? "red" : "green"}
        >
          ${Math.abs(round(value, 2))}
        </Typography>
      ),
    },
    {
      field: "action",
      type: "actions",
      headerName: "Action",
      flex: 1,
      getActions: ({ row }) => [
        <GridActionsCellItem
          disabled={row.checked}
          icon={
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            <BeenhereOutlinedIcon color={!row.checked ? "primary" : "gray"} />
          }
          onClick={async () => {
            await checkTrigger({ id: row._id });
          }}
          label="Edit"
        />,
      ],
    },
  ];

  const rows = data.map((item, index) => ({
    id: index,
    _id: item._id,
    alert_id: item.alert_id,
    name: item.name,
    limit: item.budget,
    amountUsed: item.used,
    threshold: item.threshold,
    amountvsthreshould: item.budget - item.used,
    checked: !!item.checked_at,
  }));

  const handleRowClick = async (params: GridRowParams) => {
    await checkTrigger({ id: params.row._id });
    onRowClick(params);
  };

  return (
    <DataGrid
      columns={columns}
      rows={rows}
      getRowClassName={({ row }) => (row.checked ? styles["row-disabled"] : "")}
      onRowClick={handleRowClick}
    />
  );
};

export default AlertNotification;
