import { Box, FormControl, LinearProgress, MenuItem, Select, Slider, TextField, Typography } from "@mui/material";
import Tail from "../Tail";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../../store";
import { setData } from "../../../../slices/policy";
import { useGetInjectionActionsQuery } from "../../../../api/policy/controls/injection";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
        },
    },
};

const InjectionStep = () => {
    const dispatch = useAppDispatch();
    const descriptiveActions = useGetInjectionActionsQuery();
    const current = useAppSelector(state => state.policy.current);
    const [action, setAction] = useState<string>(current.injection?.action || '');
    const [threshold, setThreshold] = useState<number>(current.injection?.threshold || 0.5);
    const [customMessage, setCustomeMessage] = useState<string>(current.injection?.custom_message || '');
    useEffect(() => {
        if (!action && descriptiveActions.isSuccess && descriptiveActions.data.length > 0) {
            setAction(descriptiveActions?.data[0].value);
        }
    }, [action, descriptiveActions]);

    const onNextStep = (next: () => any) => {
        dispatch(setData({
            injection: {
                action,
                threshold,
                custom_message: customMessage,
            }
        }));
        next();
    };

    return <Box display="flex" flexDirection="column" gap="16px">
        <Typography variant="h4">Policy Configuration</Typography>
        <Typography variant="h5">Injection</Typography>
        {descriptiveActions.isLoading && !descriptiveActions.data ? <LinearProgress /> :
                <Box display="flex" flexDirection='column' gap='16px'>
                    <FormControl>
                            <Typography>Threshold</Typography>
                            <Slider 
                                marks={[{ value: 0, label: '0' }, { value: 1, label: '1' }]} 
                                valueLabelDisplay="on" 
                                min={0} 
                                max={1} 
                                step={0.01} 
                                shiftStep={0.05}
                                value={threshold}
                                onChange={(ev) => setThreshold(ev.target.value)}
                                />
                            </FormControl>
                    <Typography variant="h6">Action</Typography>
                    <FormControl>
                    <Select
                        name="actions"
                        fullWidth
                        defaultValue={action}
                        value={action}
                        onChange={(ev) => setAction(ev.target.value)}
                    >
                        {descriptiveActions.data?.map(el => <MenuItem key={el.value} value={el.value}>{el.name}</MenuItem>)}
                    </Select>
                    </FormControl>
                    {action === 'CustomResponse' ? (<>
                        <Typography variant="h6">Custom message</Typography>
                        <TextField fullWidth onChange={(ev) => setCustomeMessage(ev.target.value)} value={customMessage} />
                    </>) : null}
                </Box>
        }
        <Tail onNextClick={onNextStep} />
    </Box >;
};

export default InjectionStep;
