import { TextField } from "@mui/material";
import { Controller } from "react-hook-form";
import { DataFormProps } from "../DataFormFactory";
import TimeoutField from "../../fields/TimeoutField";
import NumberField from "../../fields/NumberField";


const DataForm: React.FC<DataFormProps> = ({ control, current }: DataFormProps) => <>
    <Controller
        name="gemini.api_key"
        defaultValue={current?.gemini?.api_key}
        rules={{ required: 'Api key is required' }}
        control={control}
        render={({
            field: { name, onChange, value },
            fieldState: { error },
        }) => (
            <TextField
                name={name}
                label="Add API Key"
                fullWidth
                variant="standard"
                error={!!error}
                onChange={onChange}
                value={value}
                helperText={error?.message}
            />
        )}
    />
    <TimeoutField
        name='gemini'
        control={control}
        defaultValue={current?.gemini?.timeout}
    />
    <NumberField
        name="gemini.max_connections"
        control={control}
        defaultValue={current?.gemini?.max_connections || 50}
        label="Maximum number of concurrent connections"
    />
    <NumberField
        name="gemini.max_keepalive_connections"
        control={control}
        defaultValue={current?.gemini?.max_keepalive_connections || 10}
        label=" Maximum number of idle connections maintained in the pool"
    />
</>;

export default DataForm;