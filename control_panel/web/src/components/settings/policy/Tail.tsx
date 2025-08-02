import { Box, Button } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../../store";
import { back, next } from "../../../slices/policy";

type TailProps = {
    onNextClick?: (next: () => any) => void;
    onBackClick?: (back: () => any) => void;
};

const Tail = ({ onBackClick, onNextClick }: TailProps) => {
    const dispatch = useAppDispatch();
    const stepIndex = useAppSelector(state => state.policy.stepIndex);
    const nextStep = () => dispatch(next());
    const backStep = () => dispatch(back());

    return <Box display='flex' flexDirection='row' gap={'8px'}>
        {stepIndex > 0 ? <Button variant="outlined" onClick={() => { onBackClick ? onBackClick(backStep) : backStep(); }}>Back</Button> : null}
        <Button variant="contained" onClick={() => { onNextClick ? onNextClick(nextStep) : nextStep(); }}>Next</Button>
    </Box>;
};

export default Tail;