import { Box, FormControl, LinearProgress, MenuItem, Select, Typography } from "@mui/material";
import Tail from "../Tail";
import { useGetInvisibleTextActionsQuery } from "../../../../api/policy/controls/invisisble-text";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../../store";
import { setData } from "../../../../slices/policy";


const InvisibleTextStep = () => {
    const dispatch = useAppDispatch();
    const descriptiveActions = useGetInvisibleTextActionsQuery();
    const current = useAppSelector(state => state.policy.current);
    const [action, setAction] = useState<string>(current.invisible_text?.action || '');
    useEffect(() => {
        if(!current.invisible_text && descriptiveActions.isSuccess && descriptiveActions.data.length > 0) {
            setAction(descriptiveActions?.data[0].value);
        }
    }, [descriptiveActions]);

    const onNextStep = (next: () => any) => {
        dispatch(setData({
            invisible_text: {
                action,
            }
        }));
        next();
    };

    return <Box display="flex" flexDirection="column" gap="16px">
        <Typography variant="h5">Policy Configuration</Typography>
        <Typography variant="h6">Invisible Text</Typography>
        <Typography variant="h6">Action</Typography>
            {descriptiveActions.isLoading && !descriptiveActions.data ? <LinearProgress /> :
                <FormControl>
                    <Select
                        defaultValue={action}
                        value={action}
                        onChange={(ev) => setAction(ev.target.value)}
                    >
                        {descriptiveActions.data?.map(el => <MenuItem key={el.value} value={el.value}>{el.name}</MenuItem>)}
                    </Select>
                </FormControl>
            }
        <Tail onNextClick={onNextStep} />
    </Box>;
};

export default InvisibleTextStep;
