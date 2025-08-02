import { Box, TextField } from "@mui/material";
import { Control, Controller } from "react-hook-form";
import { hasNumbersOrLettersOnly } from "../../helpers";

type CommonTagsTextFieldProps = {
  control: Control<any>;
  defaultTagsValue: string[] | undefined;
};

const CommonTagsTextField = ({
  control,
  defaultTagsValue,
}: CommonTagsTextFieldProps) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      marginY={1}
      borderRadius={1}
      sx={{ background: "white" }}
    >
      <Controller
        name="tags"
        control={control}
        defaultValue={defaultTagsValue}
        render={({
          field: { name, value, onChange },
          fieldState: { error },
        }) => (
          <TextField
            name={name}
            value={value}
            error={!!error}
            variant="standard"
            label="Tags"
            helperText={error?.message ?? "Comma-separated tags"}
            onChange={onChange}
            onBlur={(e) => {
              const inputValue = e.target.value;
              const parsedValue = inputValue
                ? inputValue
                    .split(",")
                    .map((tag) => (tag ? tag.trim() : tag))
                    // .filter((tag) => !!tag && hasNumbersOrLettersOnly(tag))
                : [];
              onChange(parsedValue);
            }}
          />
        )}
      />
    </Box>
  );
};

export default CommonTagsTextField;
