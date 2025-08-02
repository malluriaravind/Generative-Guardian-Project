import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../../store";
import { FiltersForm, setFilter } from "../../../slices/log_viewer";
import { Controller, useForm } from "react-hook-form";
import { useGetApiKeysQuery } from "../../../api/apikey";
import { useFetchLlmQuery } from "../../../api/llm";

const LogViewerFilterPanel = () => {
  const dispatch = useAppDispatch();
  const filterData = useAppSelector((state) => state.logViewer.filter);
  const { handleSubmit, control } = useForm<FiltersForm>();
  const { data: apps } = useGetApiKeysQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { data: providers } = useFetchLlmQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const onApplyFilterClick = (data) => {
    dispatch(setFilter(data));
  };

  const onChangeApplyFilters = (onChange, event) => {
    onChange(event);
    handleSubmit(onApplyFilterClick)();
  };

  return (
    <Stack
      direction="row"
      py="16px"
      gap="8px"
      justifyContent="stretch"
      alignItems="center"
      sx={{ borderBottom: "1px solid rgba(1, 1, 1, 0.12)" }}
      mb="32px"
    >
      <Controller
        name="app"
        control={control}
        defaultValue={filterData?.app}
        render={({ field: { name, onChange, value } }) => (
          <FormControl sx={{ flex: "1" }}>
            <InputLabel id="app-filter-label">Application</InputLabel>
            <Select
              variant="standard"
              id="app-filter-select"
              label="Application"
              labelId="app-filter-label"
              onChange={(e) => {
                onChangeApplyFilters(onChange, e);
              }}
              name={name}
              value={value}
            >
              <MenuItem value="">None</MenuItem>
              {apps?.map((item) => (
                <MenuItem value={item._id} key={item._id}>
                  {item.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      />
      <Controller
        name="llm"
        control={control}
        defaultValue={filterData?.llm}
        render={({ field: { name, onChange, value } }) => (
          <FormControl sx={{ flex: "1" }}>
            <InputLabel id="provider-filter-label">Provider</InputLabel>
            <Select
              variant="standard"
              id="provider-filter-select"
              label="Provider"
              labelId="provider-filter-label"
              onChange={(e) => {
                onChangeApplyFilters(onChange, e);
              }}
              value={value}
              name={name}
            >
              <MenuItem value="">None</MenuItem>
              {providers?.map((item) => (
                <MenuItem value={item._id} key={item._id}>
                  {item.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      />
    </Stack>
  );
};

export default LogViewerFilterPanel;
