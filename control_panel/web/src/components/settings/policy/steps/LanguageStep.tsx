import { Box, Checkbox, FormControl, LinearProgress, ListItemText, MenuItem, Select, TextField, Typography } from "@mui/material";
import Tail from "../Tail";
import { useGetLanguageActionsQuery, useGetLanguagesQuery } from "../../../../api/policy/controls/language";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../../store";
import { setData } from "../../../../slices/policy";
import { Language } from "../../../../types/policy/controls/language";

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

const LanguageStep = () => {
    const dispatch = useAppDispatch();
    const descriptiveActions = useGetLanguageActionsQuery();
    const languages = useGetLanguagesQuery();
    const current = useAppSelector(state => state.policy.current);
    const [action, setAction] = useState<string>(current.languages?.action || '');
    const [allowedLanguages, setAllowedLanguages] = useState<string[]>(current.languages?.allowed_languages || []);
    const [customMessage, setCustomeMessage] = useState<string>(current.languages?.custom_message || '');
    const [langNames, setLangNames] = useState<{[key: string]: string}>({});
    useEffect(() => {
        if (!action && descriptiveActions.isSuccess && descriptiveActions.data.length > 0) {
            setAction(descriptiveActions?.data[0].value);
        }
    }, [action, descriptiveActions]);

    useEffect(() => {
        if(!languages.data) {
            return;
        }
        setLangNames(Object.assign(
            {},
            ...languages.data.map((el) => ({ [el.code]: el.name }))
          ));
    }, [languages.data]);

    const onNextStep = (next: () => any) => {
        dispatch(setData({
            languages: {
                action,
                allowed_languages: allowedLanguages,
                custom_message: customMessage,
            }
        }));
        next();
    };

    return <Box display="flex" flexDirection="column" gap="16px">
        <Typography variant="h4">Policy Configuration</Typography>
        <Typography variant="h5">Languages</Typography>
        {descriptiveActions.isLoading && !descriptiveActions.data ? <LinearProgress /> :
                <Box display="flex" flexDirection='column' gap='16px'>
                    <Typography variant="h6">Allowed prompt languages</Typography>
                    <FormControl>
                    <Select
                        multiple
                        defaultValue={allowedLanguages}
                        value={allowedLanguages}
                        onChange={({target}) => setAllowedLanguages(typeof target.value === 'string'? target.value.split(','): target.value)}
                        renderValue={(selected) => selected.map(el => langNames[el]).join(', ')}
                        MenuProps={MenuProps}
                    >
                        {languages.data?.map(({ code, name }) => <MenuItem key={code} value={code}>
                            <Checkbox checked={allowedLanguages.indexOf(code) > -1} />
                            <ListItemText primary={name} />
                        </MenuItem>)}
                    </Select>
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

export default LanguageStep;
