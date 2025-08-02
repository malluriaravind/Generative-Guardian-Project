import { Autocomplete, Box, Button, FormControl, LinearProgress, SwipeableDrawer, MenuItem, Select, Slider, TextField, Typography, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import Tail from "../Tail";
import { useGetTopicsActionsQuery, useGetTopicsSuggestionsQuery } from "../../../../api/policy/controls/topics";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../../store";
import { setData } from "../../../../slices/policy";
import { Topic } from "../../../../types/policy/controls/topics";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";

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

const TopicsStep = () => {
    const dispatch = useAppDispatch();
    const descriptiveActions = useGetTopicsActionsQuery();
    const suggestedTopics = useGetTopicsSuggestionsQuery();
    const current = useAppSelector(state => state.policy.current);
    const [action, setAction] = useState<string>(current.topics?.action || '');
    const [customMessage, setCustomeMessage] = useState<string>(current.topics?.custom_message || '');
    const [topics, setTopics] = useState<Topic[]>(current.topics?.ban_topics || []);
    const [isDrawerOpened, setIsDrawerOpened] = useState<boolean>(false);
    
    const [currentTopic, setCurrentTopic] = useState<Topic>({threshold: 0.5, topic: ''});

    useEffect(() => {
        if (!action && descriptiveActions.isSuccess && descriptiveActions.data.length > 0) {
            setAction(descriptiveActions?.data[0].value);
        }
    }, [action, descriptiveActions]);

    useEffect(() => {
        if(!isDrawerOpened) {
            setCurrentTopic({threshold: 0.5, topic: ''});
        }
    }, [isDrawerOpened]);

    const onNextStep = (next: () => any) => {
        dispatch(setData({
            topics: {
                action,
                ban_topics: topics,
                custom_message: customMessage,
            }
        }));
        next();
    };

    return <Box display="flex" flexDirection="column" gap="16px">
        <Typography variant="h4">Policy Configuration</Typography>
        <Typography variant="h5">Ban topics</Typography>
        {descriptiveActions.isLoading && !descriptiveActions.data ? <LinearProgress /> :
            <Box display="flex" flexDirection='column' gap='16px'>
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
                <Box display='flex' flexDirection='row' alignItems='center' justifyContent='space-between'>
                    <Typography variant="h6">Topics</Typography>
                    <Button variant="contained" onClick={() => setIsDrawerOpened(true)}>Add topic</Button>
                </Box>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell><Typography fontWeight={'bold'}>Name</Typography></TableCell>
                                <TableCell align="right"><Typography fontWeight={'bold'}>Threshold</Typography></TableCell>
                                <TableCell align="right"></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {topics.map(el => (
                                <>
                                    <TableRow key={el.topic}>
                                        <TableCell>
                                            {el.topic}
                                        </TableCell>
                                        <TableCell align="right">{el.threshold}</TableCell>
                                        <TableCell align="right">
                                            <IconButton onClick={() => setTopics(prev => prev.filter(filterEl => filterEl !== el))} color="primary">
                                                <DeleteOutlineOutlinedIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                </>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>                
                <SwipeableDrawer
                    anchor="right"
                    open={isDrawerOpened}
                    onClose={() => {setIsDrawerOpened(false);}}
                    onOpen={() => { }}
                    >
                        <Box display='flex' flexDirection='column' gap='16px' width='30vw' px='15px' py='15px'>
                            <Typography variant="h5">New topic</Typography>
                            <Autocomplete
                                freeSolo
                                disableClearable
                                options={suggestedTopics.data || []}
                                fullWidth
                                inputValue={currentTopic.topic}
                                onInputChange={(ev, topic) => setCurrentTopic(prev => ({...prev, topic}))}
                                renderInput={(params) => <TextField {...params} label="Topic" />}
                            />
                            <FormControl>
                            <Typography>Threshold</Typography>
                            <Slider 
                                marks={[{ value: 0, label: '0' }, { value: 1, label: '1' }]} 
                                valueLabelDisplay="on" 
                                min={0} 
                                max={1} 
                                step={0.01} 
                                shiftStep={0.05}
                                value={currentTopic.threshold}
                                onChange={(ev, threshold) => setCurrentTopic(prev => ({...prev, threshold}))}
                                />
                            </FormControl>
                                <Box display='flex' flexDirection='row' gap='5px' justifyContent='end'>
                                    <Button
                                        variant="contained"
                                        onClick={() => {
                                            setTopics(prev => [...prev, {threshold: currentTopic.threshold, topic: currentTopic.topic}])
                                            setIsDrawerOpened(false);
                                        }}
                                        >
                                        Add topic
                                        </Button>
                                    <Button variant="outlined" onClick={() => setIsDrawerOpened(false)}>
                                        Cancel
                                    </Button>
                                </Box>
                                    
                        </Box>
                    </SwipeableDrawer>
                    
                </Box>
        }
        <Tail onNextClick={onNextStep} />
    </Box >;
};

export default TopicsStep;
