import {
  Box,
  Button,
  FormControl,
  SwipeableDrawer,
  TextField,
  Typography,
  InputLabel,
  Select,
  FormHelperText,
  InputAdornment,
  Checkbox,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { useForm } from "react-hook-form";
import CloseIcon from "@mui/icons-material/Close";
import { Controller } from "react-hook-form";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import {
  useCreateBudgetMutation,
  useFetchModesQuery,
  useGetBudgetWatchesQuery,
  useUpdateBudgetMutation,
} from "../../api/budget";
import { Budget, BudgetMode, BudgetRequest } from "../../types/budget";
import { budgetSchema } from "../../schemas";
import { Watch, WatchType } from "../../types/watch";
import { yupResolver } from "@hookform/resolvers/yup";
import { useGetTimezonesQuery } from "../../api/alert";
import { useEffect, useState } from "react";
import { AppFilter } from "../common/AppFilter";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import moment, { Moment } from "moment";
import CommonTagsTextField from "../common/CommonTagsTextField";
import ScopesField from "../common/ScopesField";

type BudgetDrawerProps = {
  isDrawerOpened: boolean;
  setOpenDrawer: (value: boolean) => void;
  onDrawerClose: () => void;
  current?: Budget;
};

type BudgetForm = {
  name: string;
  period: string;
  watch: Watch;
  budget: number;
  timezone: string;
  limited: boolean;
  starts_at: Date;
  ends_at: Date;
  mode: string;
  tags: string[] | null;
  scopes: string[];
};

const BudgetDrawer = ({
  isDrawerOpened,
  onDrawerClose,
  setOpenDrawer,
  current,
}: BudgetDrawerProps) => {
  const [updateBudget] = useUpdateBudgetMutation();
  const [createBudget] = useCreateBudgetMutation();
  const { data: modes } = useFetchModesQuery();
  const { data: timezones } = useGetTimezonesQuery();
  const { control, reset, handleSubmit, setError, setValue, getValues } = useForm<BudgetForm>({
    resolver: yupResolver(budgetSchema),
    defaultValues: { timezone: current?.timezone ?? "",  scopes: current?.scopes ?? [] },
  });
  const { data: watches } = useGetBudgetWatchesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const currentWatchType =
    current && current.watch?.length ? current.watch[0].object_type : "APP";
  const uniqueAppNames = [...new Set(watches?.map((item) => item.object_type))];

  const [appFilter, setAppFilter] = useState<WatchType>(currentWatchType);
  const [currentMode, setCurrentMode] = useState<BudgetMode | undefined>(
    undefined
  );
  const [filteredModels, setFilteredModels] = useState<Watch[]>(
    watches?.filter((item) => item.object_type === currentWatchType) ?? []
  );
  const [isCustomPeriodSelected, setIsCustomPeriodSelected] = useState<boolean>(
    current?.period === "Custom"
  );
  const [startAtDate, setStartAtDate] = useState<Moment>(
    moment(current?.starts_at ?? new Date())
  );

  const onPeriodSelected = (period: string) => {
    setIsCustomPeriodSelected(period === "Custom");
  };
  const onHandleSubmit = async (data: BudgetForm) => {
    if (data.ends_at < data.starts_at) {
      setError("ends_at", {
        message: "End date must be greater than start date",
      });
      return;
    }

    const request: BudgetRequest = {
      ...data,
      budget: data.budget || 0,
      watch: [{ ...data.watch, enabled: true } as Watch],
    };

    if (current) {
      await updateBudget({
        _id: current._id,
        ...request,
      });
    } else {
      await createBudget(request);
    }

    reset();
    setOpenDrawer(false);
  };

  useEffect(() => {
    setFilteredModels(
      watches?.filter((item) => item.object_type === currentWatchType) ?? []
    );
  }, [watches]);

  useEffect(() => {
    if (modes) {
      if (current) {
        setCurrentMode(modes.find((el) => el.value === current.mode));
      } else {
        setCurrentMode(modes[0]);
      }
    }
  }, [modes]);

  const onFilterChange = (ev: SelectChangeEvent<typeof appFilter>) => {
    setAppFilter(ev.target.value as WatchType);
    setFilteredModels(
      watches?.filter((item) => item.object_type === ev.target.value) ?? []
    );
  };

  return (
    <SwipeableDrawer
      anchor="right"
      open={isDrawerOpened}
      onClose={() => {
        onDrawerClose();
        setOpenDrawer(false);
        reset();
      }}
      onOpen={() => {}}
    >
      <Box
        display="flex"
        sx={{ backgroundColor: "#F5F5F5" }}
        padding={"24px"}
        gap="8px"
        flexDirection="column"
        height="100%"
        width="20vw"
      >
        <Box display="flex" flexDirection="row">
          <Typography fontSize="24px" fontStyle="normal" fontWeight="500">
            {current ? "Edit Budget" : "Create Budget"}
          </Typography>
          <Button
            variant="grayed"
            style={{ marginLeft: "auto" }}
            onClick={() => {
              reset();
              setOpenDrawer(false);
            }}
          >
            <CloseIcon />
          </Button>
        </Box>
        <Box
          display="flex"
          padding="16px"
          flexDirection="column"
          sx={{ background: "white", borderRadius: "8px" }}
        >
          <Controller
            name="name"
            control={control}
            defaultValue={current?.name}
            render={({
              field: { name, value, onChange },
              fieldState: { error },
            }) => (
              <TextField
                name={name}
                value={value}
                error={!!error}
                variant="standard"
                label="Budget name"
                helperText={error?.message ?? ""}
                onChange={onChange}
              />
            )}
          />
          <Box mt={2}>
            <ScopesField control={control} getValues={getValues} name="scopes" defaultValues={current?.scopes || []} />
          </Box>
        </Box>
        <Box
          display="flex"
          padding="16px"
          flexDirection="column"
          sx={{ background: "white", borderRadius: "8px" }}
        >
          <AppFilter
            controllerName="watch"
            appFilter={appFilter}
            uniqueAppNames={uniqueAppNames}
            filteredModels={filteredModels}
            control={control}
            defaultWatchValue={current?.watch[0]}
            onFilterChange={onFilterChange}
          ></AppFilter>
          {!current && (
            <Controller
              name="timezone"
              control={control}
              render={({
                field: { value, onChange },
                fieldState: { error },
              }) => (
                <FormControl
                  variant="standard"
                  sx={{ marginTop: "24px" }}
                  fullWidth
                  error={!!error}
                >
                  <InputLabel id="demo-simple-select-standard-label">
                    Timezone
                  </InputLabel>
                  <Select
                    labelId="demo-simple-select-standard-label"
                    id="demo-simple-select-standard"
                    label="Timezone"
                    onChange={onChange}
                    value={value}
                  >
                    {timezones?.map((timezone) => (
                      <MenuItem value={timezone}>{timezone}</MenuItem>
                    ))}
                  </Select>
                  {error ? (
                    <FormHelperText>{error.message}</FormHelperText>
                  ) : null}
                </FormControl>
              )}
            />
          )}
          {currentMode ? (
            <>
              <Controller
                name="mode"
                control={control}
                defaultValue={currentMode.value}
                render={({
                  field: { value, onChange },
                  fieldState: { error },
                }) => (
                  <FormControl
                    variant="standard"
                    sx={{ marginTop: "24px" }}
                    fullWidth
                    error={!!error}
                    disabled={!!current}
                  >
                    <InputLabel id="demo-simple-select-standard-label">
                      Mode
                    </InputLabel>
                    <Select
                      labelId="demo-simple-select-standard-label"
                      id="demo-simple-select-standard"
                      label="mode"
                      defaultValue={currentMode.value}
                      onChange={(e) => {
                        const mode = modes?.find(
                          (el) => el.value === e.target.value
                        );
                        setCurrentMode(mode);

                        onChange(e);
                        if (mode) {
                          const period = mode.supported_periods[0];
                          setValue("period", period);
                          onPeriodSelected(period);
                        }
                      }}
                      value={value}
                    >
                      {modes?.map((el) => (
                        <MenuItem value={el.value}>{el.name}</MenuItem>
                      ))}
                    </Select>
                    {error ? (
                      <FormHelperText>{error.message}</FormHelperText>
                    ) : null}
                  </FormControl>
                )}
              />
              <Controller
                name="period"
                control={control}
                defaultValue={current?.period || ""}
                render={({
                  field: { value, onChange },
                  fieldState: { error },
                }) => (
                  <FormControl
                    variant="standard"
                    sx={{ marginTop: "24px" }}
                    fullWidth
                    error={!!error}
                  >
                    <InputLabel id="demo-simple-select-standard-label">
                      Period
                    </InputLabel>
                    <Select
                      labelId="demo-simple-select-standard-label"
                      id="demo-simple-select-standard"
                      label="Period"
                      defaultValue={current?.period ?? ""}
                      onChange={(ev) => {
                        onChange(ev);
                        onPeriodSelected(ev.target.value);
                      }}
                      value={value}
                    >
                      {currentMode.supported_periods?.map((period) => (
                        <MenuItem value={period}>{period}</MenuItem>
                      ))}
                    </Select>
                    {error ? (
                      <FormHelperText>{error.message}</FormHelperText>
                    ) : null}
                  </FormControl>
                )}
              />
            </>
          ) : null}
          {isCustomPeriodSelected ? (
            <Box marginTop="16px" width="100%">
              <Controller
                name="starts_at"
                control={control}
                defaultValue={current?.starts_at ?? new Date()}
                render={({ field: { value, onChange } }) => (
                  <LocalizationProvider dateAdapter={AdapterMoment}>
                    <DatePicker
                      value={moment(value)}
                      onChange={(ev) => {
                        onChange(moment(ev));
                        setStartAtDate(moment(ev));
                      }}
                      label="Start At"
                      sx={{ width: "100%" }}
                    />
                  </LocalizationProvider>
                )}
              />
              <Controller
                name="ends_at"
                control={control}
                defaultValue={current?.ends_at ?? new Date()}
                render={({ field: { value, onChange } }) => (
                  <LocalizationProvider dateAdapter={AdapterMoment}>
                    <DatePicker
                      value={moment(value)}
                      minDate={startAtDate}
                      onChange={(ev) => onChange(moment(ev))}
                      label="Ends At"
                      sx={{ width: "100%", marginTop: "16px" }}
                    />
                  </LocalizationProvider>
                )}
              />
            </Box>
          ) : (
            <></>
          )}
          <Box marginTop="24px" width="100%">
            <Controller
              name="budget"
              defaultValue={current?.budget}
              control={control}
              render={({
                field: { value, onChange },
                fieldState: { error },
              }) => (
                <TextField
                  label="Budget"
                  variant="standard"
                  color="primary"
                  onChange={onChange}
                  value={value}
                  error={!!error}
                  fullWidth={true}
                  helperText={error?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoneyIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </Box>
          <CommonTagsTextField
            control={control}
            defaultTagsValue={current?.tags}
          />
          <Box marginTop="24px" width="100%">
            <FormControl>
              <Box display="flex" flexDirection="row" alignItems="center">
                <Typography fontSize="14px">
                  Stop spend once the budget has been reached
                </Typography>
                <Controller
                  name="limited"
                  control={control}
                  defaultValue={current?.limited || false}
                  render={({ field: { name, onChange, value } }) => (
                    <Checkbox name={name} onChange={onChange} checked={value} />
                  )}
                />
              </Box>
            </FormControl>
          </Box>
        </Box>
        <Box marginTop="auto">
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit(onHandleSubmit)}
          >
            SET BUDGET
          </Button>
        </Box>
      </Box>
    </SwipeableDrawer>
  );
};

export default BudgetDrawer;
