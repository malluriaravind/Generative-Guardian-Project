import { Box, TextField } from "@mui/material";
import Wheel from "@uiw/react-color-wheel";
import { hsvaToHex } from "@uiw/color-convert";
import { Control, Controller } from "react-hook-form";

type ColorWheelProps = {
  name: string;
  control: Control;
  fullWidth?: boolean;
  defaultColor?: string | null;
};

const ColorWheel = ({
  name,
  control,
  fullWidth,
  defaultColor,
}: ColorWheelProps) => {
  return (
    <Controller
      defaultValue={defaultColor ?? hsvaToHex({ h: 214, s: 43, v: 90, a: 1 })}
      name={name}
      rules={{ required: 'Color is required' }}
      control={control}
      render={({ field: { onChange, value } }) => (
        <>
          <Box
            display="flex"
            flexDirection="row"
            justifyContent={fullWidth ? "center" : "left"}
          >
            <Wheel
              color={value}
              onChange={(color) => onChange(hsvaToHex(color.hsva))}
            />
            <Box
              height="50px"
              width="50px"
              style={{ backgroundColor: value }}
            ></Box>
          </Box>
          <TextField
            fullWidth={fullWidth}
            onChange={(ev) => onChange(ev.target.value)}
            variant="standard"
            helperText="Pick your color"
            value={value}
          />
        </>
      )}
    ></Controller>
  );
};

export default ColorWheel;
