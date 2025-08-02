import {
  Box,
  LinearProgress,
  SwipeableDrawer,
  Typography,
  Button,
  TextField,
  Select,
  FormControl,
  MenuItem,
  InputLabel,
  Autocomplete,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
  FormHelperText,
  SelectChangeEvent,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import {
  useCreateAlertMutation,
  useGetAppAndModelsQuery,
  useGetPeriodsQuery,
  useGetTimezonesQuery,
  useUpdateAlertMutation,
} from "../../api/alert";
import { alertSchema } from "../../schemas";
import { AlertCreateRequest, AlertResponse } from "../../types/alert";
import { Watch, WatchType } from "../../types/watch";
import { useFetchBudgetsQuery } from "../../api/budget";
import { useEffect, useState } from "react";
import { AppFilter } from "../common/AppFilter";
import ScopesField from "../common/ScopesField";

type AlertDrawerForm = {
  name: string;
  alert_type: string;
  budget: number | null;
  budget_percentage: number | null;
  notify_to: string[];
  apps: Watch;
  atmost: string;
  timezone: string;
  scopes: string[];
};

type AlertsPageDrawerProps = {
  isDrawerOpened: boolean;
  setIsDrawerOpened: (value: boolean) => void;
  current?: AlertResponse | null;
  onClose: () => void;
};

const AlertsPageDrawer = ({
  isDrawerOpened,
  setIsDrawerOpened,
  current,
  onClose: onDrawerClose,
}: AlertsPageDrawerProps) => {
  const [createAlert, { isLoading: isAlertLoading }] = useCreateAlertMutation();
  const [updateAlert] = useUpdateAlertMutation();
  const { data: budgets } = useFetchBudgetsQuery();
  const { data: periods } = useGetPeriodsQuery();
  const { data: timezones } = useGetTimezonesQuery();

  const { control, handleSubmit, reset, getValues } = useForm<AlertDrawerForm>({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    resolver: yupResolver(alertSchema),
    defaultValues: current
      ? {
          alert_type: "spend",
          timezone: current?.timezone,
          budget: current?.budget,
          scopes: current?.scopes,
        }
      : {
          alert_type: "spend",
          apps: { name: "" },
          atmost: "",
          budget: null,
          budget_percentage: null,
          timezone: "",
          name: undefined,
          notify_to: [],
          scopes: [],
        },
  });
  const { data: modelData, isLoading: isAppModelsLoading } =
    useGetAppAndModelsQuery();
  const [currentWatch, setCurrentWatch] = useState<Watch | null>(
    current?.watch[0] ?? null
  );
  const [budgetType, setBudgetType] = useState<"budget" | "percentage">(
    current && current?.budget_percentage ? "percentage" : "budget"
  );
  let currentWatchType = (current && current.watch?.length) ? current.watch[0].object_type : "APP";
  const [appFilter, setAppFilter] = useState<WatchType>(currentWatchType);
  const [filteredModels, setFilteredModels] = useState<Watch[]>(modelData?.filter(item => item.object_type === currentWatchType) ?? []);
  const uniqueAppNames = [...new Set(modelData?.map(item => item.object_type))];

  const onFilterChange = (ev: SelectChangeEvent<typeof appFilter>) => {
    setAppFilter(ev.target.value as WatchType);
    setFilteredModels(modelData?.filter(item => item.object_type === ev.target.value) ?? []);
  }
  const onModelChange = (ev: SelectChangeEvent<any>) => {
    setCurrentWatch(ev.target.value);
    setBudgetType("budget");
  }
  const onHandleSubmit = async (data: AlertDrawerForm) => {
    const request: AlertCreateRequest = {
      ...data,
      budget: data.budget || 0,
      period: data.atmost,
      watch: [{ ...data.apps, enabled: true } as Watch],
    };

    if (current) {
      if (budgetType === "budget") {
        request.budget_percentage = 0;
      }
      await updateAlert({
        id: current._id,
        ...request,
      });
    } else {
      await createAlert(request);
    }

    reset();
    setIsDrawerOpened(false);
  };

  useEffect(() => {
    setFilteredModels(modelData?.filter(item => item.object_type === currentWatchType) ?? []);
  }, [modelData]);

  return (
    <SwipeableDrawer
      anchor="right"
      open={isDrawerOpened}
      onClose={() => {
        setBudgetType("budget");
        setCurrentWatch(null);
        onDrawerClose();
        reset();
      }}
      onOpen={() => {}}
    >
      {isAlertLoading ? <LinearProgress /> : null}
      <Box
        display="flex"
        sx={{ backgroundColor: "#F5F5F5" }}
        padding={"24px"}
        flexDirection="column"
        height="100%"
        width="20vw"
      >
        <Box display="flex" flexDirection="row">
          <Typography fontSize="24px" fontStyle="normal" fontWeight="500">
            {current ? "Edit Alert" : "Create Alert"}
          </Typography>
          <Button
            variant="grayed"
            style={{ marginLeft: "auto" }}
            onClick={() => {
              reset();
              setIsDrawerOpened(false);
            }}
          >
            <CloseIcon />
          </Button>
        </Box>
        <Box
          sx={{ background: "white" }}
          borderRadius="8px"
          marginTop={"16px"}
          padding={"16px"}
          display="flex"
          justifyContent="center"
          flexDirection="column"
        >
          <Controller
            name="name"
            control={control}
            defaultValue={current?.name}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <TextField
                onChange={onChange}
                value={value}
                error={!!error}
                variant="standard"
                label="Alert Name"
                helperText={
                  error?.message ||
                  "This will help you identify the alert when it gets triggered."
                }
              />
            )}
          />
          <Box mt={2}>
            <ScopesField name="scopes" control={control} getValues={getValues} defaultValues={current?.scopes || []} />
          </Box>
        </Box>
        <Box
          sx={{ background: "white" }}
          borderRadius="8px"
          marginTop={"16px"}
          padding={"16px"}
          display="flex"
          justifyContent="center"
          flexDirection="column"
          gap="16px"
        >
          <Typography
            color="rgba(0, 0, 0, 0.75)"
            fontSize="20px"
            fontWeight="500"
          >
            When
          </Typography>
          <Controller
            name="alert_type"
            control={control}
            defaultValue="spend"
            render={({
              field: { onChange, value, ref },
              fieldState: { error },
            }) => (
              <FormControl
                variant="standard"
                sx={{ marginTop: "8px" }}
                fullWidth
                error={!!error}
              >
                <InputLabel id="demo-simple-select-standard-label">
                  Alert type
                </InputLabel>
                <Select
                  ref={ref}
                  onChange={onChange}
                  value={value}
                  labelId="demo-simple-select-standard-label"
                  id="demo-simple-select-standard"
                  label="Alert type"
                >
                  <MenuItem value="spend">Spend</MenuItem>
                </Select>
                {error ? (
                  <FormHelperText>{error.message}</FormHelperText>
                ) : null}
              </FormControl>
            )}
          />
          {isAppModelsLoading ? <LinearProgress /> : null}
          <AppFilter
            controllerName="apps"
            appFilter={appFilter}
            uniqueAppNames={uniqueAppNames}
            filteredModels={filteredModels}
            control={control}
            defaultWatchValue={current?.watch[0]}
            onFilterChange={onFilterChange}
            customOnChangeModel={onModelChange}
          ></AppFilter>
          <Controller
            name="atmost"
            control={control}
            defaultValue={current?.period || ""}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <FormControl
                variant="standard"
                sx={{ marginTop: "24px" }}
                fullWidth
                error={!!error}
              >
                <InputLabel id="demo-simple-select-standard-label">
                  At most
                </InputLabel>
                <Select
                  labelId="demo-simple-select-standard-label"
                  id="demo-simple-select-standard"
                  label="App / Model"
                  defaultValue="daily"
                  onChange={onChange}
                  value={value}
                >
                  {periods?.map((period) => (
                    <MenuItem value={period}>{period}</MenuItem>
                  ))}
                </Select>
                {error ? (
                  <FormHelperText>{error.message}</FormHelperText>
                ) : null}
              </FormControl>
            )}
          />
          {
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
                    disabled={!!current}
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
          }
          <ToggleButtonGroup value={budgetType} fullWidth>
            <ToggleButton
              value="budget"
              onClick={() => setBudgetType("budget")}
            >
              $ SPEND
            </ToggleButton>
            <ToggleButton
              value="percentage"
              onClick={() => {
                setBudgetType("percentage");
              }}
              disabled={
                typeof budgets === "undefined" ||
                !budgets?.find((el) => {
                  if (!currentWatch) {
                    return false;
                  }
                  return el.watch[0].name === currentWatch.name;
                })
              }
            >
              % OF BUDGET
            </ToggleButton>
          </ToggleButtonGroup>
          {budgetType === "budget" ? (
            <Controller
              name="budget"
              key="budget"
              control={control}
              defaultValue={current?.budget}
              render={({
                field: { name, value, onChange },
                fieldState: { error },
              }) => (
                <TextField
                  name={name}
                  label="Budget"
                  variant="standard"
                  color="primary"
                  onChange={onChange}
                  value={value}
                  error={!!error}
                  helperText={error?.message || ""}
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
          ) : (
            <Controller
              name="budget_percentage"
              key="budget_percentage"
              defaultValue={current?.budget_percentage}
              control={control}
              render={({
                field: { name, value, onChange },
                fieldState: { error },
              }) => (
                <TextField
                  name={name}
                  label="Budget percentage"
                  variant="standard"
                  color="primary"
                  onChange={onChange}
                  value={value}
                  error={!!error}
                  helperText={error?.message || ""}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PercentOutlinedIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          )}
        </Box>
        <Box
          sx={{ background: "white" }}
          borderRadius="8px"
          marginTop="16px"
          padding="16px"
          display="flex"
          justifyContent="center"
          flexDirection="column"
        >
          <Typography
            color="rgba(0, 0, 0, 0.75)"
            fontSize="20px"
            fontWeight="500"
          >
            Notify
          </Typography>
          <Controller
            name="notify_to"
            control={control}
            defaultValue={current?.notify_to}
            render={({ field: { onChange, value }, fieldState: { error } }) => {
              return (
                <Autocomplete
                  clearIcon={false}
                  options={[]}
                  freeSolo
                  multiple
                  onChange={(_, value) => onChange(value)}
                  value={value}
                  renderTags={(value, props) =>
                    value.map((option, index) => (
                      <Chip label={option} {...props({ index })} />
                    ))
                  }
                  renderInput={(params) => (
                    <Box marginTop="24px">
                      <TextField
                        error={!!error}
                        variant="standard"
                        label="To email"
                        {...params}
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        //@ts-ignore
                        helperText={
                          (error &&
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            //@ts-ignore
                            error.length &&
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            //@ts-ignore
                            error.length > 0 &&
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            //@ts-ignore
                            error[0]?.message) ||
                          "You can invite multiple users at once. When you add new email please press ENTER key. For example user1@company.com, user2@company.com, etc."
                        }
                      />
                    </Box>
                  )}
                />
              );
            }}
          />
        </Box>
        <Box marginTop="auto">
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit(onHandleSubmit)}
          >
            SAVE ALERT
          </Button>
        </Box>
      </Box>
    </SwipeableDrawer>
  );
};

export default AlertsPageDrawer;
