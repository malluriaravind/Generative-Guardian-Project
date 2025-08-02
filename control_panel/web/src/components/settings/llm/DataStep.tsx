import {
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { Box } from "@mui/system";
import { Controller, useForm } from "react-hook-form";
import {
  useGetDescriptiveProvidersQuery,
  useTestLlmMutation,
} from "../../../api/llm";
import { setData, setModels } from "../../../slices/llm";
import { useState } from "react";
import { useDispatch } from "react-redux";
import ColorWheel from "../common/ColorWheel";
import { ErrorData } from "../../../types/error";
import { LlmResponse, ModelObject } from "../../../types/llm";
import { Providers } from "../../../types/providers.ts";
import DataFormFactory from "./providers/DataFormFactory.tsx";
import CommonTagsTextField from "../../common/CommonTagsTextField.tsx";
import ScopesField from "../../common/ScopesField.tsx";

type DataStepProps = {
  current?: LlmResponse | null;
  nextStep: () => void;
};

type LlmConnectionState = {
  message: string;
  isConnectionError: boolean | null;
};

interface ConnectionError {
  data: ErrorData;
}
const DataStep = ({ current, nextStep }: DataStepProps) => {
  const { data: providers } = useGetDescriptiveProvidersQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [provider, setProvider] = useState<Providers>(
    current?.provider || "OpenAI"
  );
  const { control, handleSubmit, getValues } = useForm<LlmResponse>({
    mode: "onChange",
    defaultValues: current || {},
    shouldUnregister: true,
  });
  const dispatch = useDispatch();
  const [connectionStatus, setConnectionStatus] = useState<LlmConnectionState>({
    message: "",
    isConnectionError: null,
  });

  const [testLlm, { isLoading, isSuccess, isError }] = useTestLlmMutation(); //TODO: add alert

  const onHandleSubmit = async (data: LlmResponse) => {
    setConnectionStatus({ isConnectionError: null, message: "" });
    try {
      const models = (await testLlm({
        provider: data.provider,
        ...data[data.provider.toLowerCase()],
        id: current?._id || "",
      }).unwrap()) as unknown as ModelObject[];
      dispatch(setModels(models));
      setConnectionStatus({ message: "Connected", isConnectionError: false });
    } catch (err) {
      if (err as ConnectionError) {
        setConnectionStatus({
          isConnectionError: !!err,
          message: (err as ErrorData).message,
        });
      }
      return;
    }

    dispatch(setData(data));
    nextStep();
  };

  if (typeof providers === "undefined") {
    return <LinearProgress />;
  }

  return (
    <Box display="flex" flexDirection="column" gap="16px">
      <Typography fontSize="20px" fontStyle="normal" fontWeight="500">
        Select LLM
      </Typography>
      <Controller
        name="name"
        rules={{
          required: "Name is requred",
          min: { value: 3, message: "Name should have at least 3 characters" },
        }}
        defaultValue={current?.name}
        control={control}
        render={({
          field: { name, onChange, value },
          fieldState: { error },
        }) => (
          <TextField
            name={name}
            label="NAME"
            fullWidth
            variant="standard"
            error={!!error}
            onChange={onChange}
            value={value}
            helperText={error?.message || "Short, descriptive name for the LLM"}
          />
        )}
      />
      <ScopesField name="scopes" control={control} getValues={getValues} defaultValues={current?.scopes || []} />
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment  */}
      {/* @ts-ignore */}
      <ColorWheel
        name="color"
        control={control}
        defaultColor={current?.color}
      />
      <Controller
        name="provider"
        rules={{ required: "Provider is required" }}
        control={control}
        defaultValue={current?.provider}
        render={({
          field: { name, value, onChange, ref },
          fieldState: { error },
        }) => (
          <FormControl
            variant="standard"
            sx={{ marginTop: "15px", minWidth: 120 }}
          >
            <InputLabel id="provider-label" error={!!error}>
              Select LLM Provider
            </InputLabel>
            <Select
              name={name}
              labelId="provider-label"
              value={value}
              disabled={!!current}
              label="LLM Provider"
              onChange={(ev) => {
                setProvider(ev.target.value);
                onChange(ev);
              }}
              error={!!error}
              inputRef={ref}
            >
              {providers.map(({ name, value }) => (
                <MenuItem key={value} value={value}>
                  {name}
                </MenuItem>
              ))}
            </Select>
            <CommonTagsTextField
              control={control}
              defaultTagsValue={current?.tags}
            />
            <FormHelperText error={!!error}>
              {error?.message || ""}
            </FormHelperText>
          </FormControl>
        )}
      />

      {isLoading || isSuccess || isError ? (
        <Box display="flex" flexDirection="column">
          {connectionStatus.isConnectionError === null ? (
            <LinearProgress />
          ) : (
            <LinearProgress
              variant="determinate"
              color={connectionStatus.isConnectionError ? "error" : "success"}
              value={100}
            />
          )}

          <Typography
            fontSize="11px"
            fontStyle="normal"
            fontWeight="400"
            color={connectionStatus.isConnectionError ? "red" : "green"}
          >
            {connectionStatus.isConnectionError === null
              ? "Testing connection..."
              : connectionStatus.message}
          </Typography>
        </Box>
      ) : null}
      <DataFormFactory
        control={control}
        current={current}
        provider={provider}
      />
      <Box display="flex">
        <Button
          color="primary"
          variant="outlined"
          onClick={handleSubmit(onHandleSubmit)}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
};

export default DataStep;
