import { Box, Button, FormControl, InputLabel, LinearProgress, MenuItem, Select, Stack } from "@mui/material";
import { useGetDescriptiveLogExportFormatsQuery, useGetDescriptiveLogRetentionsQuery, useGetLogSettingsQuery, useUpdateLogSettingsMutation } from "../../../api/log_viewer";
import { Controller, useForm } from "react-hook-form";
import { LogSettings } from "../../../types/log_viewer";

type SettingsLogViewerDrawerProps = {
    onClick: () => void;
};

const SettingsLogViewerDrawer = ({ onClick }: SettingsLogViewerDrawerProps) => {
    const { data: exportFormats } = useGetDescriptiveLogExportFormatsQuery();
    const { data: retentions } = useGetDescriptiveLogRetentionsQuery();
    const { data: logSettings } = useGetLogSettingsQuery(undefined, { refetchOnMountOrArgChange: true });
    const [updateLogSettings] = useUpdateLogSettingsMutation();
    const { control, handleSubmit } = useForm<LogSettings>();
    return <><Stack direction='column'>
        <Box
            sx={{ background: "white" }}
            borderRadius="8px"
            marginTop={"16px"}
            padding={"16px"}
            display="flex"
            justifyContent="center"
            flexDirection="column"
        >
            <FormControl sx={{ marginTop: "18px" }}>
                <InputLabel id="retention-period-label">
                    Retention period
                </InputLabel>
                {typeof logSettings?.retention_hours === 'undefined' ? <LinearProgress />: 
                <Controller
                    control={control}
                    name="retention_hours"
                    defaultValue={logSettings?.retention_hours}
                    render={({ field: { name, value, onChange } }) =>
                        <Select
                            variant="standard"
                            id="retention-period-select"
                            label="Retention period"
                            labelId="retention-period-label"
                            name={name}
                            value={value}
                            onChange={onChange}
                        >
                            {typeof retentions === 'undefined' ? <LinearProgress /> : retentions.map(({ name, hours }) => (
                                <MenuItem value={hours} key={name}>{name}</MenuItem>
                            ))}
                        </Select>
                    } />
                }
            </FormControl>
            <FormControl sx={{ marginTop: "18px" }}>
                <InputLabel id="export-format-label">
                    Export Format
                </InputLabel>
                {typeof logSettings?.export_format === 'undefined' ? <LinearProgress />: 
                <Controller
                    control={control}
                    name="export_format"
                    defaultValue={logSettings?.export_format}
                    render={({ field: { name, value, onChange } }) =>
                        <Select
                            variant="standard"
                            id="export-format-select"
                            label="Export Format"
                            labelId="export-format-label"
                            name={name}
                            value={value}
                            onChange={onChange}
                        >
                            {typeof exportFormats === 'undefined' ? <LinearProgress /> : exportFormats?.map(({ name, value }) => (
                                <MenuItem value={value} key={name}>{name}</MenuItem>
                            ))}
                        </Select>
                    } />}
            </FormControl>
        </Box>
    </Stack>
        <Stack marginTop='auto'>
            <Button color="primary" variant="contained" onClick={handleSubmit((data) => {
                updateLogSettings(data);
                onClick();
            })}>APPLY SETTINGS</Button>
        </Stack>
    </>;
};

export default {
    title: "Settings",
    component: SettingsLogViewerDrawer
};