import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  useGetDescriptiveAttributeFieldsQuery,
  useGetDescriptiveFieldsQuery,
  useLazyFetchLogsQuery,
  useLazyFetchRRLogsQuery,
} from "../../../api/log_viewer";
import { useAppDispatch, useAppSelector } from "../../../store";
import {
  MaterialReactTable,
  MRT_ColumnDef,
  MRT_VisibilityState,
  useMaterialReactTable,
} from "material-react-table";
import { Box, Button, LinearProgress, Stack } from "@mui/material";
import KeywordSearchToolTip from "./KeywordSearchToolTip";
import ReqResHorizontalDialogTextItem from "./ReqResField";
import { LogViewerResponse } from "../../../types/log_viewer";
import moment from "moment";
import { setFilter } from "../../../slices/log_viewer";
import LogViewerDialog from "../dialog";
import DialogTextItem from "../dialog/DialogTextItem";

const SHORT_MESSAGE_LENGTH = 128;

type LogViewerTableProps = {
  isDebugLog?: boolean;
};

const LogViewerTable = ({ isDebugLog = false }: LogViewerTableProps) => {
  const dispatch = useAppDispatch();
  const [keywords, setKeywords] = useState<string[]>([]);
  const [dialogContent, setDialogContent] = useState<ReactNode | null>(null);
  const logFilters = useAppSelector((state) => state.logViewer.filter);
  const { data: additionalColumns = [] } = useGetDescriptiveFieldsQuery(
    undefined,
    { refetchOnMountOrArgChange: true }
  );
  const [rowRequestId, setRowRequestId] = useState<string | null>(null);
  const [fetchLogs, { data = [], isFetching }] = isDebugLog ? useLazyFetchLogsQuery() : useLazyFetchRRLogsQuery();
  const fetchParams = {
    ...Object.entries(logFilters)
      .filter(([_, value]) => !!value)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {}),
    end: logFilters.endDate ?? logFilters.end,
  };

  const onRequestIdButtonClick = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    requestId: string
  ) => {
    event.stopPropagation();
    // dispatch(setFilter({ keywords: requestId }));
    setKeywords((prev) => [...prev, requestId]);
  };

  useEffect(() => {
    fetchLogs(fetchParams);
  }, [logFilters]);

  const definedColumns = [
    "request_id",
    "raw_request",
    "raw_response",
    "created_at",
    "_id",
    "message",
  ];
  const columns = useMemo<MRT_ColumnDef<LogViewerResponse>[]>(
    () => [
      {
        accessorKey: "request_id",
        header: "Request id",
        maxSize: 10,
        Cell: ({ cell }) => {
          const requestId = cell.getValue() as string | null;
          return !requestId ? null : (
            <Button
              variant="outlined"
              onClick={(ev) => onRequestIdButtonClick(ev, requestId)}
              sx={{ textTransform: "none" }}
            >
              {requestId}
            </Button>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Timestamp",
        Cell: ({ cell }) => moment(cell.getValue<string>()).local().toString(),
      },
      ...isDebugLog ? [{
        accessorKey: "message",
        header: "Message",
        Cell: ({ cell }) => {
          const value = cell.getValue();
          if (!value || typeof value === "undefined") {
            return;
          }
          if (value.length < SHORT_MESSAGE_LENGTH) {
            return value;
          }
          return value.slice(0, SHORT_MESSAGE_LENGTH) + "...";
        },
      }] : [],
      {
        accessorKey: "raw_request",
        header: "Raw request",
        enableHiding: true,
        Cell: ({ cell }) => {
          const value = cell.getValue();
          const parsedValue =
            typeof value === "object" ? JSON.stringify(value) : value || "";
          if (parsedValue.length < SHORT_MESSAGE_LENGTH) {
            return parsedValue;
          }
          return parsedValue.slice(0, SHORT_MESSAGE_LENGTH) + "...";
        },
      },
      {
        accessorKey: "raw_response",
        header: "Raw response",
        enableHiding: true,
        Cell: ({ cell }) => {
          const value = cell.getValue();
          const parsedValue =
            typeof value === "object" ? JSON.stringify(value) : value || "";
          if (parsedValue.length < SHORT_MESSAGE_LENGTH) {
            return parsedValue;
          }
          return parsedValue.slice(0, SHORT_MESSAGE_LENGTH) + "...";
        },
      },
      ...additionalColumns
        .filter((el) => definedColumns.indexOf(el.name) < 0)
        .map(({ name, title }) => ({
          accessorKey: name,
          header: title || name,
          enableHiding: true,
          Cell: ({ cell }) => {
            const value = cell.getValue();
            if (typeof value === "object") {
              return JSON.stringify(value);
            }
            return value;
          },
        })),
    ],
    [additionalColumns]
  );

  const [columnVisibility, setColumnVisibility] = useState<MRT_VisibilityState>(
    {}
  );
  useEffect(() => {
    if (Object.keys(columnVisibility).length > 0) {
      return;
    }
    setColumnVisibility((prev) => ({
      ...prev,
      ...additionalColumns
        .filter((el) => definedColumns.indexOf(el.name) < 0)
        .map(({ name }) => ({ [name]: false }))
        .reduce((acc, current) => ({ ...acc, ...current }), {}),
    }));
  }, [additionalColumns]);

  const table = useMaterialReactTable({
    columns,
    data,
    enablePagination: false,
    enableColumnOrdering: true,
    initialState: {
      showGlobalFilter: false,
    },
    state: {
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
    muiSearchTextFieldProps: () => ({
      onChange: (ev) => dispatch(setFilter({ keywords: ev.target.value })),
      value: logFilters.keywords,
      placeholder: "Keywords",
      sx: { minWidth: "300px" },
      variant: "outlined",
    }),
    enableGlobalFilter: false,
    muiTablePaperProps: () => ({
      sx: {
        boxShadow: "none",
      },
    }),
    renderTopToolbarCustomActions: () => (
      <KeywordSearchToolTip keywords={keywords} setKeywords={setKeywords} />
    ),
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        const attributes = [];
        const rowData = row.original;
        if (!rowData || typeof rowData === "undefined") {
          return;
        }
        if (rowData.request_id) {
          setRowRequestId(rowData.request_id);
          attributes.push(
            <ReqResHorizontalDialogTextItem request_id={rowData.request_id} />
          );
        }
        Object.entries(rowData).forEach(([key, value]) => {
          if (!value) {
            return;
          }
          const column = additionalColumns.find((el) => el.name === key);

          if (!isDebugLog && (!column || !column.show)) {
            return;
          }

          attributes.push(
            <DialogTextItem
              key={key}
              name={column?.title || key}
              value={value}
            />
          );
        });
        setDialogContent(
          <Box display="flex" gap={1} alignContent="flex-start" flexWrap="wrap">
            {attributes}
          </Box>
        );
      },
      style: {
        cursor: "pointer",
      },
    }),
    muiTopToolbarProps: () => ({
      style: {
        justifyContent: "end",
        alignItems: "center",
      },
    }),
    muiTableBodyCellProps: ({ row }) =>
      row.original.levelno >= 40
        ? {
          style: { background: "#f5dcdc" },
        }
        : {},
    renderBottomToolbarCustomActions: () => (
      <Stack flex="1">
        <Button
          disabled={isFetching}
          variant="outlined"
          fullWidth
          color="primary"
          onClick={() => {
            dispatch(
              setFilter({
                endDate: new Date(
                  data[data?.length - 1].created_at
                ).toISOString(),
              })
            );
          }}
        >
          Load more
        </Button>
        {isFetching ? <LinearProgress /> : null}
      </Stack>
    ),
  });

  if (typeof data === "undefined") {
    return <LinearProgress />;
  }

  return (
    <Box bgcolor="white" p="32px" borderRadius="8px">
      <LogViewerDialog
        requestId={rowRequestId}
        content={dialogContent}
        isPanelOpened={dialogContent !== null}
        onClose={() => {
          setDialogContent(null);
          setRowRequestId(null);
        }}
      />
      <MaterialReactTable table={table} />
    </Box>
  );
};

export default LogViewerTable;
