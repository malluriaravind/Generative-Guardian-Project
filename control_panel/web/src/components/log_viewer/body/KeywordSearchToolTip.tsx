import { useEffect, useState } from "react";
import { Chip, Stack } from "@mui/material";
import { TextField, Button, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useAppDispatch } from "../../../store";
import { setFilter } from "../../../slices/log_viewer";
import { Controller, useForm } from "react-hook-form";


type KeywordSearchToolTipProps = {
    keywords?: string[];
    setKeywords: (arg: string) => void;
};
  
const KeywordSearchToolTip = ({keywords, setKeywords}: KeywordSearchToolTipProps) => {
    const dispatch = useAppDispatch();
    const { control, handleSubmit, reset } = useForm({ defaultValues: { keyword: '' } });

    const onAddKeword = (data) => {
        if (!data.keyword.trim()) {
            return;
        }
        setKeywords(prev => [...prev, data.keyword]);
        reset();
    };

    const onDeleteKeyword = (keyword: string) => {
        setKeywords(keywords.filter(el => el !== keyword));
    };

    useEffect(() => {
        dispatch(setFilter({ keywords: keywords.join(" ") }));
        return () => { dispatch(setFilter({ keywords: "" })); }
    }, [keywords]);

    return <Stack direction='row'>
        <Stack direction='row' flexWrap='wrap' flex='1' gap='8px' p="8px">
            {keywords.map(el => <Chip label={el} onDelete={() => onDeleteKeyword(el)} />)}
        </Stack>
        <Controller
            control={control}
            name="keyword"
            render={({ field: { name, onChange, value } }) =>
                <TextField
                    label="Search"
                    variant="outlined"
                    value={value}
                    name={name}
                    onChange={onChange}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                        endAdornment: <Button variant="contained" onClick={handleSubmit(onAddKeword)}>
                            Search
                        </Button>
                    }} />} />
    </Stack>
};


export default KeywordSearchToolTip;