import { Control, Controller } from "react-hook-form";
import { TextField } from "@mui/material";
import { LlmResponse } from "../../../../types/llm";


type NumberFieldProps = {
    control: Control<LlmResponse, any>;
    defaultValue: number;
    name: string;
    label: string;
};

const NumberField = ({ defaultValue, control, name, label }: NumberFieldProps) =>
    <Controller
        name={name}
        defaultValue={defaultValue}
        rules={{ required: `${label} is required`, min: { message: 'Minimum should be higher than 1', value: 1 } }}
        control={control}
        render={({
            field: { name, onChange, value },
            fieldState: { error },
        }) => (
            <TextField
                name={name}
                label={label}
                fullWidth
                variant="standard"
                error={!!error}
                onChange={onChange}
                value={value}
                helperText={error?.message}
            />
        )}
    />;

export default NumberField;