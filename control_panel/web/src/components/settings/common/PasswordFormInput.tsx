import { IconButton, InputAdornment, TextField } from "@mui/material";
import { ReactNode, useState } from "react";
import { Controller } from "react-hook-form";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

type PasswordFormInputProps = {
  control: any;
  disabled: boolean;
  name: string;
  label: string;
  helperText: string | ReactNode;
};

export const PasswordFormInput = ({
  control,
  disabled,
  name,
  label,
  helperText,
}: PasswordFormInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const handleClickShowPassword = () => setShowPassword(!showPassword);
  const handleMouseDownPassword = () => setShowPassword(!showPassword);
  return (
    <Controller
      control={control}
      defaultValue=""
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        return (
          <TextField
            label={label}
            variant="standard"
            size="medium"
            color="primary"
            error={!!error}
            helperText={error?.message || helperText}
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder="Example: MyP@ssw0rd!"
            fullWidth
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

export default PasswordFormInput;
