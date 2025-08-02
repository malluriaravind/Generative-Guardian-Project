import { TextField } from "@mui/material";
import { DataFormProps } from "../DataFormFactory";
import { Controller } from "react-hook-form";
import TimeoutField from "../../fields/TimeoutField";
import NumberField from "../../fields/NumberField";


const DataForm = ({ control, current }: DataFormProps) => (
    <>
        <Controller
            name="bedrock.access_key_id"
            rules={{ required: 'Access key id is required' }}
            control={control}
            defaultValue={current?.bedrock?.access_key_id}
            render={({
                field: { name, onChange, value },
                fieldState: { error },
            }) => (
                <TextField
                    name={name}
                    label="Add Access key id"
                    fullWidth
                    variant="standard"
                    error={!!error}
                    onChange={onChange}
                    value={value}
                    helperText={error?.message}
                />
            )}
        />

        <Controller
            name="bedrock.access_key"
            rules={{ required: 'Access key is required' }}
            control={control}
            defaultValue={current?.bedrock?.access_key}
            render={({
                field: { name, onChange, value },
                fieldState: { error },
            }) => (
                <TextField
                    name={name}
                    label="Add Access key"
                    fullWidth
                    variant="standard"
                    error={!!error}
                    onChange={onChange}
                    value={value}
                    helperText={error?.message}
                />
            )}
        />
        <Controller
            name="bedrock.region"
            rules={{ required: 'Region is required' }}
            control={control}
            defaultValue={current?.bedrock?.region}
            render={({
                field: { name, onChange, value },
                fieldState: { error },
            }) => (
                <TextField
                    name={name}
                    label="Add Region"
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
            name='bedrock'
            control={control}
            defaultValue={current?.bedrock?.timeout}
        />
        <NumberField
          name="bedrock.max_connections"
          control={control}
          defaultValue={current?.bedrock?.max_connections || 50}
          label="Maximum number of concurrent connections"
        />
        <NumberField
            name="bedrock.max_keepalive_connections"
            control={control}
            defaultValue={current?.bedrock?.max_keepalive_connections || 10}
            label=" Maximum number of idle connections maintained in the pool"
        />
    </>
);

export default DataForm;