import { ReactNode } from "react";
import { TextField } from "@mui/material";
import { Controller } from "react-hook-form";

type FormInputProps = {
  name: string;
  label: string;
  inputType: string;
  control: any;
  disabled: boolean;
  defaultValue: string;
  helperText?: string | ReactNode | null;
  placeholder: string;
};

export const FormInput = ({
  name,
  label,
  inputType,
  control,
  disabled,
  defaultValue,
  helperText,
  placeholder,
}: FormInputProps) => {
  return (
    <Controller
      control={control}
      defaultValue={defaultValue}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <TextField
          label={label}
          error={!!error}
          helperText={error?.message || helperText}
          variant="standard"
          size="medium"
          type={inputType}
          onChange={onChange}
          disabled={disabled}
          value={value}
          placeholder={placeholder}
        />
      )}
    />
  );
};
