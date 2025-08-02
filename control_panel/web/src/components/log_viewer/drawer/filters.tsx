import { Box, Button, Checkbox, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import { useGetApiKeysQuery } from "../../../api/apikey";
import { useFetchLlmQuery } from "../../../api/llm";
import { FiltersForm, resetLogViewer, setFilter } from "../../../slices/log_viewer";
import { useGetDescriptiveLogHttpCodesQuery, useGetDescriptiveLogLevelsQuery } from "../../../api/log_viewer";
import { useAppDispatch, useAppSelector } from "../../../store";
import { Controller, useForm } from "react-hook-form";

type FiltersLogViewerDrawerProps = {
    onClick: () => void;
};

const FiltersLogViewerDrawer = ({ onClick }: FiltersLogViewerDrawerProps) => {
    const { data: apps } = useGetApiKeysQuery(undefined, { refetchOnMountOrArgChange: true });
    const { data: providers } = useFetchLlmQuery(undefined, { refetchOnMountOrArgChange: true });
    const { data: logLevels } = useGetDescriptiveLogLevelsQuery(undefined, { refetchOnMountOrArgChange: true });
    const { data: httpCodes } = useGetDescriptiveLogHttpCodesQuery(undefined, { refetchOnMountOrArgChange: true });
    const { handleSubmit, control, reset } = useForm<FiltersForm>();
    const filterData = useAppSelector(state => state.logViewer.filter);
    const dispatch = useAppDispatch();

    return <>
        <Stack direction='column'>
            <Box
                sx={{ background: "white" }}
                borderRadius="8px"
                marginTop={"16px"}
                padding={"16px"}
                display="flex"
                justifyContent="center"
                flexDirection="column"
            >
                <Controller 
                name="app"
                control={control}
                defaultValue={filterData?.app}
                render={({field: {name, onChange, value}}) => 
                <FormControl sx={{ marginTop: "8px" }}>
                    <InputLabel id="app-filter-label">
                        Application
                    </InputLabel>
                    <Select
                        variant="standard"
                        id="app-filter-select"
                        label="Application"
                        labelId="app-filter-label"
                        onChange={onChange}
                        name={name}
                        value={value}
                    >
                        {apps?.map((item) => (
                            <MenuItem value={item._id} key={item._id}>{item.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                }/>
                <Controller 
                name="llm"
                control={control}
                defaultValue={filterData?.llm}
                render={({field: {name, onChange, value}}) => 
                <FormControl sx={{ marginTop: "8px" }}>
                    <InputLabel id="provider-filter-label">
                        Provider
                    </InputLabel>
                    <Select
                        variant="standard"
                        id="provider-filter-select"
                        label="Provider"
                        labelId="provider-filter-label"
                        onChange={onChange}
                        value={value}
                        name={name}
                    >
                        {providers?.map((item) => (
                            <MenuItem value={item._id} key={item._id}>{item.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>} />
                <Controller 
                name="method"
                control={control}
                defaultValue={filterData?.method}
                render={({field: {name, onChange, value}}) => 
                <FormControl sx={{ marginTop: "8px" }}>
                    <InputLabel id="method-filter-label">
                        Method filter
                    </InputLabel>
                    <Select
                        variant="standard"
                        id="method-filter-select"
                        label="Method filter"
                        labelId="method-filter-label"
                        name={name}
                        onChange={onChange}
                        value={value}
                    >
                        {['POST', 'GET', 'OPTIONS', 'DELETE'].map((item) => (
                            <MenuItem value={item} key={item}>{item}</MenuItem>
                        ))}
                    </Select>
                </FormControl>} />
                <Controller 
                name="status"
                control={control}
                defaultValue={filterData?.status}
                render={({field: {name, onChange, value}}) => 
                <FormControl sx={{ marginTop: "8px" }}>
                    <InputLabel id="status-codes-label">
                        Status codes
                    </InputLabel>
                    <Select
                        variant="standard"
                        id="status-codes-select"
                        label="Status codes"
                        labelId="status-codes-label"
                        name={name}
                        onChange={onChange}
                        value={value}
                    >
                        {httpCodes?.map(({name, value}) => (
                            <MenuItem value={value} key={name}>{name}</MenuItem>
                        ))}
                    </Select>
                </FormControl> } />
                <Controller 
                name="level"
                control={control}
                defaultValue={filterData?.level}
                render={({field: {name, onChange, value}}) => 
                <FormControl sx={{ marginTop: "8px" }}>
                    <InputLabel id="log-levels-label">
                        Log levels
                    </InputLabel>
                    <Select
                        variant="standard"
                        id="log-levels-label-select"
                        label="Log levels"
                        labelId="log-levels-label"
                        onChange={onChange}
                        value={value}
                        name={name}
                    >
                        {typeof logLevels === 'undefined' ? null : logLevels.map(({ level, name }, index) => (
                            <MenuItem value={level} key={index}>{level} - {name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>} />
            <Box
              display="flex"
              marginTop="15px"
              flexDirection="row"
              alignItems="center"
            >
              <Typography fontSize="18px" fontWeight="400">
                Show log requests and responses
              </Typography>
             <Controller 
              name="reqres"
              control={control}
              defaultValue={filterData?.reqres}
              render={({field: {name, value, onChange, disabled}}) => <Checkbox disabled={disabled} name={name} checked={value} onChange={onChange} />}
             />   
            </Box>
            </Box>
        </Stack>
        <Stack marginTop='auto' rowGap='8px'>
            <Button color="primary" variant="contained" onClick={handleSubmit((data) => {
                dispatch(setFilter(data));
                onClick();
            })}>APPLY FILTER</Button>
            <Button color="primary" variant="contained" onClick={() => {
                reset({
                    app: null,
                    llm: null,
                    level: null,
                    method: null,
                    status: null,
                    reqres: false,
                });
                dispatch(resetLogViewer());
            }}>CLEAR FILTER</Button>
        </Stack>
    </>;
};

export default {
    title: "Filters",
    component: FiltersLogViewerDrawer
};