import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  TextField,
  Typography,
  FormHelperText,
  FormControl,
  Stack,
  Alert,
} from "@mui/material";
import Tail from "./Tail";
import { Controller, useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "../../../store";
import { setData, setSteps } from "../../../slices/policy";
import { useEffect, useState } from "react";
import { useGetPolicyControlsQuery } from "../../../api/policy";
import { setAlert } from "../../../slices/alert";
import { Policy } from "../../../types/policy";
import ScopesField from "../../common/ScopesField";

type PolicyManagerForm = {
  name: string;
  controls: string[];
};

const stepsMap: { [key: string]: string } = {
  PII: "pii-config",
  InvisibleText: "invisible-text",
  Languages: "languages",
  Topics: "topics",
  Injection: "injection",
  CodeProvenance: "code-provenance",
};

const PolicyManager = () => {
  const current = useAppSelector((state) => state.policy.current);
  const dispatch = useAppDispatch();
  const { data: controls } = useGetPolicyControlsQuery();
  const { control, handleSubmit, reset, setError, getValues } = useForm<
    PolicyManagerForm & Policy
  >({ defaultValues: current });
  const [selectedControls, setSelectedControls] = useState<string[]>([]);

  const onNextStep = async (next: () => any) => {
    const onSubmit = (data: PolicyManagerForm) => {
      if (selectedControls.length === 0) {
        setError("controls", {
          message: "At least one option should be selected.",
        });
        dispatch(
          setAlert({
            shouldRender: true,
            message: "At least one option should be selected.",
            type: "error",
            title: "",
          })
        );
        return;
      }
      dispatch(setData({ ...current, ...data, controls: selectedControls }));
      dispatch(setSteps(selectedControls.map((el) => stepsMap[el])));
      next();
    };
    await handleSubmit(onSubmit)();
  };

  useEffect(() => {
    if (current && selectedControls.length == 0) {
      reset(current);
      setSelectedControls(current.controls);
    }
  }, [current]);

  const onControlsChange = (event) => {
    const {
      target: { checked, value },
    } = event;
    if (checked) {
      setSelectedControls((prev) =>
        // On autofill we get a stringified value.
        [...prev, value]
      );
    } else {
      const index = selectedControls.indexOf(value);
      if (index >= 0) {
        setSelectedControls((prev) => [
          ...prev.slice(0, index),
          ...prev.slice(index + 1),
        ]);
      }
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap="16px">
      <Typography variant="h5">
        {current.name ? "Update" : "Create"} new Policy
      </Typography>
      <Controller
        name="name"
        control={control}
        rules={{ required: "Name is required" }}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <TextField
            name="name"
            label="NAME"
            fullWidth
            variant="standard"
            error={!!error}
            onChange={onChange}
            value={value}
            helperText={
              error?.message || "Short, descriptive name for the Policy"
            }
          />
        )}
      />
      <ScopesField name="scopes" control={control} getValues={getValues} defaultValues={current?.scopes || []} />
      {/* <FormControl>
        <Stack flexDirection="row" alignItems="center">
          <Controller
            name="apply_to_responses"
            control={control}
            defaultValue={current?.apply_to_responses || false}
            render={({ field: { name, onChange, value } }) => (
              <Checkbox name={name} onChange={onChange} checked={value} />
            )}
          />
          <Typography fontSize="14px">Apply to responses</Typography>
        </Stack>
      </FormControl> */}
      <Typography variant="h6">Controls</Typography>
      {controls?.some((el) => el.disabled) ? (
        <Alert severity="info">
          Some controls are disabled. If you want to use them please uncheck{" "}
          <b>ENABLE_SECURITY_POLICY_CONTROL</b> property located in
          Configuration page in General section.
        </Alert>
      ) : null}
      <Typography></Typography>
      <Controller
        name="controls"
        control={control}
        render={({ fieldState: { error } }) => {
          return (
            <FormGroup onChange={(ev) => onControlsChange(ev)}>
              {controls?.map(({ name, value, disabled }) => (
                <FormControlLabel
                  control={<Checkbox />}
                  label={name}
                  value={value}
                  disabled={
                    typeof stepsMap[value] === "undefined" ||
                    (disabled && selectedControls.indexOf(value) < 0)
                  }
                  checked={selectedControls.indexOf(value) > -1}
                />
              ))}
              <FormHelperText error={!!error}>{error?.message}</FormHelperText>
            </FormGroup>
          );
        }}
      />
      <Tail onNextClick={onNextStep} />
    </Box>
  );
};

export default PolicyManager;
