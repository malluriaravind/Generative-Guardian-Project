import { SwipeableDrawer, Box, Typography, Button, TextField, LinearProgress, FormControl, MenuItem, FormHelperText, Select, InputLabel } from "@mui/material";
import { Control, Controller, UseFormHandleSubmit } from "react-hook-form";
import CloseIcon from "@mui/icons-material/Close";
import { CreatePiiRequest, Pii } from "../../../types/policy/controls/pii";
import { useGetParentEntitiesQuery } from "../../../api/policy/controls/pii";

type PolicySwipeableDrawerProps = {
    isDrawerOpened: boolean;
    control: Control<Pii, any>;
    onHandleSubmit: (data: CreatePiiRequest) => Promise<void>;
    handleSubmit: UseFormHandleSubmit<Pii, undefined>;
    setIsDrawerOpened: (value: boolean) => void;
};

export const PolicySwipeableDrawer = ({
    isDrawerOpened,
    control,
    handleSubmit,
    onHandleSubmit,
    setIsDrawerOpened
}: PolicySwipeableDrawerProps) => {
    const { data:parentEntites } = useGetParentEntitiesQuery();
    const styles = {
        mainBox: {
            display: "flex",
            backgroundColor: "#F5F5F5",
            padding: "24px",
            flexDirection: "column",
            height: "100%",
            width: "320px"
        },
        innerBox: {
            background: "white",
            height: "100%",
            borderRadius: "8px",
            marginTop: "16px",
            padding: "16px",
            display: "flex",
            justifyContent: "center",
            flexDirection: "column"
        },
        textField: {
            marginTop: "24px"
        }
    }

    return <SwipeableDrawer
        anchor="right"
        open={isDrawerOpened}
        onClose={() => { }}
        onOpen={() => { }}
    >
        <Box
            sx={styles.mainBox}
        >
            <Box
                sx={styles.innerBox}
            >
                <Box display="flex" flexDirection="row">
                    <Typography fontSize="24px" fontStyle="normal" fontWeight="500">
                        Add Entity
                    </Typography>

                    <Button
                        variant="grayed"
                        style={{ marginLeft: "auto" }}
                        onClick={() => setIsDrawerOpened(false)}
                    >
                        <CloseIcon />
                    </Button>
                </Box>

                <Controller
                    name="entity"
                    control={control}
                    defaultValue=""
                    rules={{ required: 'Name is required' }}
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <TextField
                            variant="standard"
                            label="Entity name"
                            style={styles.textField}
                            error={!!error}
                            onChange={onChange}
                            value={value}
                            helperText={
                                error?.message || "Short, descriptive name for the entity"
                            }
                        />
                    )}
                />

                <Controller
                    name="description"
                    control={control}
                    defaultValue=""
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <TextField
                            variant="standard"
                            label="Description"
                            style={styles.textField}
                            error={!!error}
                            onChange={onChange}
                            value={value}
                            helperText={
                                error?.message || "Description of entity behavior"
                            }
                        />
                    )}
                />
                <Controller
                    name="pattern"
                    defaultValue=""
                    control={control}
                    rules={{ required: 'Name is required' }}
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <TextField
                            variant="standard"
                            label="Pattern"
                            style={styles.textField}
                            error={!!error}
                            onChange={onChange}
                            value={value}
                            helperText={
                                error?.message || "Pattern of entity"
                            }
                        />
                    )}
                />
                <Controller
                    name="context_words"
                    defaultValue={[]}
                    control={control}
                    rules={{
                        pattern: {
                            value: /^(\s*\w+\s*,\s*)*\s*\w+\s*$/,
                            message: 'Please enter a valid string separated by commas'
                        }
                    }}                    
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <TextField
                            variant="standard"
                            label="Comma-separated context words"
                            style={styles.textField}
                            error={!!error}
                            onChange={onChange}
                            onBlur={(e) => {
                                const inputValue = e.target.value;
                                 const parsedValue = inputValue
                                     ? inputValue.split(',').map(word => word.trim()).filter(Boolean)
                                     : [];
                                onChange(parsedValue);
                            }}
                            value={Array.isArray(value) ? value.join(', ') : value}
                            helperText={
                                error?.message || "Optional. Increase the detection confidence of an entity in case a specific word appears before or after it. The initial confidence score of the context-aware entity will be bery low, and increased with the existence of context words. Note that the multilingual fallback model does not provide contextual boost"
                            }
                        />
                    )}
                />
                {parentEntites === null ? <LinearProgress />: 
                    <Controller
                        name="prerecognition_entity"
                        control={control}
                        render={({
                            field: { onChange, value, ref },
                            fieldState: { error },
                        }) => (
                            <FormControl
                                variant="standard"
                                sx={{ marginTop: "8px" }}
                                fullWidth
                                error={!!error}
                                style={styles.textField}
                            >
                                <InputLabel id="prerecognition_entity-select-standard-label">
                                    Prerecognition Entity
                                </InputLabel>
                                <Select
                                    ref={ref}
                                    onChange={onChange}
                                    value={value}
                                    labelId="prerecognition_entity-select-standard-label"
                                    id="prerecognition_entity-select-standard"
                                    label="Prerecognition Entity"
                                >
                                    {parentEntites?.map(el => <MenuItem value={el.entity}>{el.entity}</MenuItem>)}
                                </Select>
                                <FormHelperText>{error ?error.message: `Optional. Select a base model entity to narrow search to spans pre-recognized by the selected entity. It is useful if you want to catch a specific name, location, organization etc`}</FormHelperText>
                            </FormControl>
                        )}
                    />
                }
                <Box marginTop="auto">
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={handleSubmit(onHandleSubmit)}
                    >
                        <Typography>{"Create Entity"}</Typography>
                    </Button>
                </Box>
            </Box>
        </Box>
    </SwipeableDrawer>
};
