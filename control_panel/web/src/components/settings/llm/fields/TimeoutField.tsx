import { Control, Controller } from "react-hook-form";
import { TextField } from "@mui/material";
import { LlmResponse } from "../../../../types/llm";


type TimeoutFieldProps = {
    control: Control<LlmResponse, any>;
    defaultValue: number | undefined;
    name: string
};

const TimeoutField = ({ defaultValue, control, name }: TimeoutFieldProps) =>
    <Controller
        name={`${name}.timeout`}
        defaultValue={defaultValue || 10}
        rules={{ required: 'Timeout is required', min: { message: 'Minimum should be higher than 1', value: 1 } }}
        control={control}
        render={({
            field: { name, onChange, value },
            fieldState: { error },
        }) => (
            <TextField
                name={name}
                label="Timeout"
                fullWidth
                variant="standard"
                error={!!error}
                onChange={onChange}
                value={value}
                helperText={error?.message}
            />
        )}
    />;

export default TimeoutField;