import {
  Box,
  Button,
  Checkbox,
  InputLabel,
  LinearProgress,
  ListItemText,
  MenuItem,
  Stack,
  SwipeableDrawer,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Controller, useForm } from "react-hook-form";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { useState } from "react";
import {
  useCreateApiKeyMutation,
  useUpdateApiKeyMutation,
} from "../../../api/apikey";
import { useFetchLlmQuery } from "../../../api/llm";
import { useAppDispatch } from "../../../store";
import { setAlert } from "../../../slices/alert";
import {
  ApiKeyCreateRequest,
  ApiKeyResponse,
  ApiKeyUpdateRequest,
} from "../../../types/apikey";
import ColorWheel from "../common/ColorWheel";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import moment from "moment";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { useFetchModelPoolsQuery } from "../../../api/modelpool";
import { useGetPoliciesQuery } from "../../../api/policy";
import { PolicyResponseItem } from "../../../types/policy";
import CommonTagsTextField from "../../common/CommonTagsTextField";
import { useGetDescriptiveLogDurationsQuery, useGetDescriptiveLogLevelsQuery } from "../../../api/log_viewer";
import ScopesField from "../../common/ScopesField";

type ApiKeyGenDrawerProps = {
  current: ApiKeyResponse | null;
  isDrawerOpened: boolean;
  setOpenDrawer: (value: boolean) => void;
  setNewApiKey: (value: string) => void;
};

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const ApiKeyGenDrawer = ({
  current,
  isDrawerOpened,
  setOpenDrawer,
  setNewApiKey,
}: ApiKeyGenDrawerProps) => {
  const dispatch = useAppDispatch();
  const { control, handleSubmit, reset, watch, setValue, getValues } = useForm<ApiKeyResponse>({
    defaultValues: current || {},
  });
  const [selectedLlmIds, setSelectedLlmIds] = useState<string[]>(
    current?.llm_access || []
  );
  const [selectedPoolIds, setSelectedPoolIds] = useState<string[]>(
    current?.pool_access || []
  );
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>(
    current?.policies || []
  );
  const [createApiKey] = useCreateApiKeyMutation();
  const [updateApiKey] = useUpdateApiKeyMutation();
  const llmsPackages = useFetchLlmQuery();
  const modelPoolsPackage = useFetchModelPoolsQuery();
  const policiesPackage = useGetPoliciesQuery();
  const {data: logDurations} = useGetDescriptiveLogDurationsQuery();
  const {data: logLevels} = useGetDescriptiveLogLevelsQuery();
  let llmsNames: { [key: string]: string } = {};
  if (llmsPackages.data) {
    llmsNames = Object.assign(
      {},
      ...llmsPackages.data.map((el) => ({ [el._id]: el.name }))
    );
  }

  let policiesNames: { [key: string]: string } = {};
  if (policiesPackage.data) {
    policiesNames = Object.assign(
      {},
      ...policiesPackage.data.map((el: PolicyResponseItem) => ({
        [el._id]: el.name,
      }))
    );
  }

  let modelPoolNames: { [key: string]: string } = {};
  if (modelPoolsPackage.data) {
    modelPoolNames = Object.assign(
      {},
      ...modelPoolsPackage.data.map((el) => ({ [el._id]: el.name }))
    );
  }

  function handleStringArrayChange<T>(
    event: SelectChangeEvent<T>,
    setSelectedValuesAsArray: (value: React.SetStateAction<string[]>) => void
  ) {
    const {
      target: { value },
    } = event;

    let valueToSet: string[] = value as string[];
    // On autofill we get a stringified value.
    if (typeof value === "string") valueToSet = (value as "string").split(",");

    setSelectedValuesAsArray(valueToSet);
  }

  const onHandleSubmit = async (data: ApiKeyResponse) => {
    const options: ApiKeyCreateRequest = {
      ...data,
      llm_access: selectedLlmIds,
      pool_access: selectedPoolIds,
      policies: selectedPolicies,
      expires_at: moment(data.expires_at).toISOString(),
    };

    if (data.rate_requests) {
      options.rate_requests = data.rate_requests;
      options.rate_period = data.rate_period;
    }

    if (current) {
      await updateApiKey({
        ...(options as ApiKeyUpdateRequest),
        id: current._id,
      });
      setOpenDrawer(false);
      reset();
      return;
    }
    try {
      const { key } = (await createApiKey(options).unwrap()) as unknown as {
        key: string;
      };
      setNewApiKey(key);
    } catch (e) {
      dispatch(
        setAlert({
          shouldRender: true,
          type: "error",
          title: "",
          message: "Error during creating apikey",
        })
      );
    } finally {
      reset();
    }
  };

  return (
    <SwipeableDrawer
      anchor="right"
      open={isDrawerOpened}
      onClose={() => setOpenDrawer(false)}
      onOpen={() => { }}
    >
      <Box
        display="flex"
        sx={{ backgroundColor: "#F5F5F5" }}
        padding={"24px"}
        flexDirection="column"
        height="100%"
        width="320px"
      >
        <Box display="flex" flexDirection="row">
          <Typography fontSize="24px" fontStyle="normal" fontWeight="500">
            {current ? "Edit APP" : "Create APP"}
          </Typography>
          <Button
            variant="grayed"
            style={{ marginLeft: "auto" }}
            onClick={() => setOpenDrawer(false)}
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
            defaultValue={current?.name || ""}
            control={control}
            rules={{ required: "Name is required" }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <TextField
                variant="standard"
                label="NAME"
                error={!!error}
                onChange={onChange}
                value={value}
                helperText={
                  error?.message || "Short, descriptive name for the key"
                }
              />
            )}
          />
          <Controller
            name="key"
            defaultValue={current?.key || null}
            control={control}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <TextField
                variant="standard"
                label="KEY"
                error={!!error}
                onChange={onChange}
                value={value}
                helperText={
                  error?.message ||
                  "Key can be left empty and will automatically be filled by system"
                }
              />
            )}
          />
          <Box marginTop="24px">
            <ScopesField control={control} name="scopes" getValues={getValues} defaultValues={current?.scopes || []} />
          </Box>
          <Box marginTop="24px">
            <Controller
              name="llm_access"
              defaultValue={current?.llm_access || []}
              control={control}
              render={() => (
                <FormControl variant="standard" fullWidth>
                  <InputLabel id="Provider Accesss">PROVIDER ACCESS</InputLabel>
                  <Select
                    labelId="Provider Access"
                    id="llmselect"
                    multiple
                    value={selectedLlmIds}
                    renderValue={(selected) =>
                      selected
                        .map((el) => llmsNames[el])
                        .filter((el) => el)
                        .join(", ")
                    }
                    MenuProps={MenuProps}
                    onChange={(event) => {
                      handleStringArrayChange<typeof selectedLlmIds>(
                        event,
                        setSelectedLlmIds
                      );
                    }}
                  >
                    {llmsPackages.data?.map((item) => (
                      <MenuItem key={item.name} value={item._id}>
                        <Checkbox
                          checked={
                            selectedLlmIds.findIndex((id) => id === item._id) >
                            -1
                          }
                        />
                        <ListItemText primary={item.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </Box>
          <Box marginTop="24px">
            <Controller
              name="policies"
              defaultValue={current?.policies || []}
              control={control}
              render={() => (
                <FormControl variant="standard" fullWidth>
                  <InputLabel id="policy-access-label">POLICIES</InputLabel>
                  <Select
                    labelId="policy-access-label"
                    id="policy-access"
                    multiple
                    value={selectedPolicies}
                    renderValue={(selected) =>
                      selected.map((el) => policiesNames[el]).join(", ")
                    }
                    MenuProps={MenuProps}
                    onChange={(event) => {
                      handleStringArrayChange<typeof selectedPolicies>(
                        event,
                        setSelectedPolicies
                      );
                    }}
                  >
                    {policiesPackage.data?.map((item) => (
                      <MenuItem key={item.name} value={item._id}>
                        <Checkbox
                          checked={
                            selectedPolicies.findIndex(
                              (id) => id === item._id
                            ) > -1
                          }
                        />
                        <ListItemText primary={item.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </Box>
          <Box marginTop="24px">
            <Controller
              name="pool_access"
              defaultValue={current?.pool_access || []}
              control={control}
              render={() => (
                <FormControl variant="standard" fullWidth>
                  <InputLabel id="poolaccess">POOL ACCESS</InputLabel>
                  <Select
                    labelId="poolaccess"
                    id="poolselect"
                    multiple
                    value={selectedPoolIds}
                    renderValue={(selected) =>
                      selected.map((el) => modelPoolNames[el]).join(", ")
                    }
                    MenuProps={MenuProps}
                    onChange={(event) => {
                      handleStringArrayChange<typeof selectedPoolIds>(
                        event,
                        setSelectedPoolIds
                      );
                    }}
                  >
                    {modelPoolsPackage.data?.map((item) => (
                      <MenuItem key={item.name} value={item._id}>
                        <Checkbox
                          checked={
                            selectedPoolIds.findIndex((id) => id === item._id) >
                            -1
                          }
                        />
                        <ListItemText primary={item.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </Box>
          <CommonTagsTextField
            control={control}
            defaultTagsValue={current?.tags}
          />
          <Box marginTop="24px" display="flex" alignItems="center">
            <Controller
              name="expires_at"
              control={control}
              defaultValue={current?.expires_at}
              render={({ field: { value, onChange } }) => (
                <LocalizationProvider dateAdapter={AdapterMoment}>
                  <DatePicker
                    value={moment(value)}
                    onChange={(ev) => onChange(moment(ev))}
                    label="EXPIRATION DATE"
                    sx={{ width: "100%" }}
                  />
                </LocalizationProvider>
              )}
            />
          </Box>
          <Box marginTop="24px">
            <Typography fontSize="18px" fontWeight="400" color="gray">
              RATE LIMIT
            </Typography>
            <Box
              display="flex"
              marginTop="15px"
              flexDirection="row"
              alignItems="center"
            >
              <Controller
                control={control}
                name="rate_requests"
                defaultValue={current?.rate_requests}
                render={({ field: { value, onChange } }) => (
                  <TextField
                    type="number"
                    placeholder="# Requests"
                    variant="outlined"
                    value={value}
                    onChange={onChange}
                  />
                )}
              />

              <Typography padding="10px">per</Typography>
              <Controller
                name="rate_period"
                control={control}
                defaultValue={current?.rate_period || "second"}
                render={({ field: { value, onChange } }) => (
                  <Select
                    defaultValue="second"
                    value={value}
                    onChange={onChange}
                  >
                    <MenuItem value="second">Second</MenuItem>
                    <MenuItem value="minute">Minute</MenuItem>
                    <MenuItem value="hour">Hour</MenuItem>
                  </Select>
                )}
              />
            </Box>
          </Box>
          <Box marginTop="24px">
            <Typography fontSize="18px" fontWeight="400" color="gray">
              MAX PROMPT TOKENS
            </Typography>
            <Box
              display="flex"
              marginTop="15px"
              flexDirection="row"
              alignItems="center"
            >
              <Controller
                control={control}
                name="max_prompt_tokens"
                defaultValue={current?.max_prompt_tokens}
                render={({ field: { value, onChange } }) => (
                  <TextField
                    type="number"
                    placeholder="# Max number"
                    variant="outlined"
                    value={value}
                    onChange={onChange}
                    fullWidth
                    InputProps={{
                      inputProps: { min: 0 },
                    }}
                  />
                )}
              />
            </Box>
          </Box>
          <Box marginTop="24px">
            <Box
              display="flex"
              marginTop="15px"
              flexDirection="column"
            >
              <Typography fontSize="18px" fontWeight="400">
                Enable logging
              </Typography>
              <Controller
              name='log_enable'
              defaultValue={current?.log_enable}
              control={control}
              render={({field: {value, name, onChange}}) => <Switch checked={value} name={name} onChange={onChange} />}
              />
              
            </Box>
            <Box
              display="flex"
              marginTop="15px"
              flexDirection="row"
              alignItems="center"
            >
              {typeof logDurations === 'undefined' ? <LinearProgress />: 
              <Controller
                disabled={!watch('log_enable')}
                name="log_duration_hours"
                defaultValue={current?.log_retention_hours || 0}
                control={control}
                render={({field: {name, value, disabled, onChange}}) => (
                  <FormControl disabled={disabled} variant="standard" fullWidth>
                    <InputLabel id="duration-configuration-label">Duration Configuration</InputLabel>
                    <Select
                      labelId="duration-configuration-label"
                      id="duration-configuration"
                      name={name}
                      value={value}
                      defaultValue={0}
                      onChange={(ev) => {setValue('log_until', null);onChange(ev)}}
                    >
                      {logDurations?.map((item) => (
                        <MenuItem key={item.name} value={item.hours}>{item.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            }
            </Box>
            <Box
              display="flex"
              marginTop="15px"
              flexDirection="row"
              alignItems="center"
            >
              {typeof logLevels === 'undefined' ? <LinearProgress />: 
              <Controller
                name="log_level"
                disabled={!watch('log_enable')}
                defaultValue={current?.log_level}
                control={control}
                render={({field: {name, value, disabled, onChange}}) => (
                  <FormControl disabled={disabled} variant="standard" fullWidth>
                    <InputLabel id="log-level-label">Log Level</InputLabel>
                    <Select
                      name={name}
                      value={value}
                      labelId="log-level-label"
                      id="log-level"
                      onChange={onChange}
                    >
                      {logLevels?.map(({name, level}) => (
                        <MenuItem key={name} value={level}>{name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
              }
            </Box>
          </Box>
          <Box
              display="flex"
              marginTop="15px"
              flexDirection="row"
              alignItems="center"
            >
              <Typography fontSize="18px" fontWeight="400">
                Enable log requests and responses
              </Typography>
             <Controller 
              name="log_reqres"
              control={control}
              defaultValue={current?.log_reqres}
              render={({field: {name, value, onChange, disabled}}) => <Switch disabled={disabled} name={name} checked={value} onChange={onChange} />}
             />   
            </Box>
          <Box marginTop="36px" alignItems="center">
            <Typography fontSize="18px" fontWeight="400" color="gray">
              COLOR
            </Typography>
            <ColorWheel defaultColor={null} name="color" control={control} fullWidth />
          </Box>
          {/* <Box marginTop={2}>
            <FormControl>
              <Stack flexDirection="row" alignItems="center">
                <Controller
                  name="log_prompts"
                  control={control}
                  defaultValue={current?.log_prompts || false}
                  render={({ field: { name, onChange, value } }) => (
                    <Checkbox name={name} onChange={onChange} checked={value} />
                  )}
                />
                <Typography fontSize="18px">Log Prompts</Typography>
              </Stack>
            </FormControl>
          </Box>
          <Box marginTop={2}>
            <FormControl>
              <Stack flexDirection="row" alignItems="center">
                <Controller
                  name="log_completions"
                  control={control}
                  defaultValue={current?.log_completions || false}
                  render={({ field: { name, onChange, value } }) => (
                    <Checkbox name={name} onChange={onChange} checked={value} />
                  )}
                />
                <Typography fontSize="18px">Log Completions</Typography>
              </Stack>
            </FormControl>
          </Box> */}
        </Box>
        <Box marginTop="auto">
          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit(onHandleSubmit)}
          >
            <Typography>{current ? "EDIT APP" : "CREATE APP"}</Typography>
          </Button>
        </Box>
      </Box>
    </SwipeableDrawer>
  );
};

export default ApiKeyGenDrawer;
