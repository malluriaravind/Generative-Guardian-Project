import { IconButton, InputAdornment, Switch, TextField } from "@mui/material";
import { useState } from "react";
import { Controller } from "react-hook-form";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

type FormInputProps = { control: any; disabled: boolean };

export const EmailFormInput = ({ control, disabled }: FormInputProps) => {
  return (
    <Controller
      control={control}
      defaultValue=""
      name="email"
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <TextField
          label="Email"
          error={!!error}
          helperText={error?.message}
          variant="standard"
          size="medium"
          type="email"
          onChange={onChange}
          disabled={disabled}
          value={value}
        />
      )}
    />
  );
};

export const PasswordFormInput = ({ control, disabled }: FormInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const handleClickShowPassword = () => setShowPassword(!showPassword);
  const handleMouseDownPassword = () => setShowPassword(!showPassword);
  return (
    <Controller
      control={control}
      defaultValue=""
      name="password"
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        return (
          <TextField
            label="Password"
            variant="standard"
            size="medium"
            error={!!error}
            helperText={error?.message}
            value={value}
            onChange={onChange}
            disabled={disabled}
            type={showPassword ? "text" : "password"}
            InputProps={{
              // <-- This is where the toggle button is added.
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                  >
                    {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        );
      }}
    />
  );
};

export const RememberMeFormInput = ({ control, disabled }: FormInputProps) => {
  return (
    <Controller
      control={control}
      defaultValue=""
      name="rememberme"
      render={({ field: { onChange, value } }) => {
        return (
          <Switch
            color="primary"
            disabled={disabled}
            size="medium"
            checked={value}
            onChange={onChange}
          />
        );
      }}
    />
  );
};
