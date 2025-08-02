import { ReactNode } from "react";
import { Checkbox, FormControlLabel, FormHelperText } from "@mui/material";
import { Controller } from "react-hook-form";

type FormInputProps<T> = {
    name: string;
    label: string;
    control: any;
    disabled: boolean;
    defaultValue: T;
};

export const CheckboxFormInput = ({
    name,
    label,
    control,
    disabled,
    defaultValue,
}: FormInputProps) => {
    return (
        <Controller
            control={control}
            defaultValue={defaultValue}
            name={name}
            render={({ field: { name, onChange, value }, fieldState: {error}}) => (
                <>
                <FormControlLabel
                    control={
                        <Checkbox
                            name={name}
                            size="medium"
                            onChange={onChange}
                            disabled={disabled}
                            checked={value}
                        />}
                    label={label} />
                    {error?.message}
                </>
            )}
        />
    );
};
