import React, { useState, useEffect } from "react";
import TextField, { TextFieldProps } from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import { styled } from "@mui/material/styles";

const StyledTextField = styled(TextField)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  "& .MuiOutlinedInput-root": {
    "& fieldset": {
      borderColor: theme.palette.grey[300],
    },
    "&:hover fieldset": {
      borderColor: theme.palette.primary.main,
    },
    "&.Mui-focused fieldset": {
      borderColor: theme.palette.primary.main,
    },
  },
  marginBottom: theme.spacing(2),
}));

export interface SearchFieldProps extends Omit<TextFieldProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceTime?: number;
  onClear?: () => void;
}

const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  debounceTime = 300,
  onClear,
  ...props
}) => {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(inputValue);
    }, debounceTime);
    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, debounceTime, onChange]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  return (
    <StyledTextField
      variant="outlined"
      fullWidth
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      placeholder={placeholder}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon color="action" />
          </InputAdornment>
        ),
        endAdornment: inputValue && (
          <InputAdornment
            position="end"
            onClick={() => {
              setInputValue('');
              if (onClear) {
                onClear();
              }
            }}
            style={{ cursor: "pointer" }}
          >
            <ClearIcon color="action" />
          </InputAdornment>
        ),
      }}
      {...props}
    />
  );
};

export default SearchField; 