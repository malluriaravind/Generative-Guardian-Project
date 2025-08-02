import { TextField } from "@mui/material";
import { DataFormProps } from "../DataFormFactory";
import { Controller } from "react-hook-form";
import TimeoutField from "../../fields/TimeoutField";
import NumberField from "../../fields/NumberField";


const DataForm = ({ control, current }: DataFormProps) => (
    <>
        <Controller
            name="azure.api_key"
            rules={{ required: 'Api key is required' }}
            control={control}
            defaultValue={current?.azure?.api_key}
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

        <Controller
            name="azure.endpoint"
            rules={{ required: 'Endpoint is required' }}
            control={control}
            defaultValue={current?.azure?.endpoint}
            render={({
                field: { name, onChange, value },
                fieldState: { error },
            }) => (
                <TextField
                    name={name}
                    label="Add Endpoint"
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
            name="azure.deployment"
            defaultValue={current?.azure?.deployment}
            rules={{ required: 'Deployment is required' }}
            control={control}
            render={({
                field: { name, onChange, value },
                fieldState: { error },
            }) => (
                <TextField
                    name={name}
                    label="Add Deployment"
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
            name="azure.version"
            defaultValue={current?.azure?.version}
            rules={{ required: 'Version is required' }}
            control={control}
            render={({
                field: { name, onChange, value },
                fieldState: { error },
            }) => (
                <TextField
                    name={name}
                    label="Add Version"
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
            name='azure'
            control={control}
            defaultValue={current?.azure?.timeout}
        />
        <NumberField
            name="azure.max_connections"
            control={control}
            defaultValue={current?.azure?.max_connections || 50}
            label="Maximum number of concurrent connections"
        />
        <NumberField
            name="azure.max_keepalive_connections"
            control={control}
            defaultValue={current?.azure?.max_keepalive_connections || 10}
            label=" Maximum number of idle connections maintained in the pool"
        />
    </>
);

export default DataForm;