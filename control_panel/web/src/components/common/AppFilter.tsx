import { FormControl, FormHelperText, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { Watch, WatchType } from "../../types/watch";
import { Control, Controller } from "react-hook-form";

type AppFilterProps = {
    controllerName: string,
    appFilter: WatchType,
    uniqueAppNames: WatchType[],
    filteredModels: Watch[],
    defaultWatchValue: Watch | undefined,
    control: Control<any>,
    onFilterChange: (ev: SelectChangeEvent<WatchType>) => void,
    customOnChangeModel?: (...event: any[]) => void
  };
  
  export const AppFilter = ({
    controllerName,
    appFilter,
    uniqueAppNames,
    filteredModels,
    defaultWatchValue,
    control,
    onFilterChange,
    customOnChangeModel
    } : AppFilterProps) => {
    return (
        <>
            <FormControl sx={{ marginTop: "8px" }}>
                <InputLabel id="demo-simple-select-standard-label-filter">
                    Filter
                </InputLabel>
                <Select
                    id="demo-simple-select-standard-filter"
                    label="Filter"
                    labelId="demo-simple-select-standard-label-filter"
                    value={appFilter}
                    onChange={(ev) => onFilterChange(ev)}
                >
                    {uniqueAppNames?.map((item) => (
                        <MenuItem value={item} key={item}>{item}</MenuItem>
                    ))}
                </Select>
            </FormControl>
            <Controller
                name={controllerName}
                control={control}
                defaultValue={defaultWatchValue}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                <FormControl
                    variant="outlined"
                    sx={{ marginTop: "8px" }}
                    fullWidth
                    error={!!error}
                    key={"form-controller-models"}
                >
                    <InputLabel id="demo-simple-select-standard-label-model" key={"form-control-models-label"}>
                        Model
                    </InputLabel>
                    <Select
                        labelId="demo-simple-select-standard-label-model"
                        id="demo-simple-select-standard"
                        label="Model"
                        value={value}
                        onChange={(ev) => {
                            customOnChangeModel?.(ev);
                            onChange(ev);
                        }}
                        renderValue={(selected) => selected.name}
                        key={"form-control-models-select"}
                    >
                        {filteredModels?.map((item) => (
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            //@ts-ignore
                            <MenuItem value={item} key={item.object_id}>{item.name}</MenuItem>
                        ))}
                    </Select>
                    {error ? (
                        <FormHelperText key={"form-control-error-helper-text"}>{error.message}</FormHelperText>
                    ) : null}
                </FormControl>
            )} />
        </>
    );
  };
