import { Autocomplete, Chip, Stack, TextField } from "@mui/material";
import { Control, useFieldArray, UseFormGetValues } from "react-hook-form";
import { trim } from "../../utils/trim";
import { useState } from "react";
import { useCheckScopeMutation } from "../../api/scopes";
import { useFetchAvailableScopesQuery } from "../../api/scopes";

type ScopesFieldProps = {
  name: string;
  control: Control;
  getValues: UseFormGetValues;
  defaultValues: string[];
};

const ScopesField = ({
  name,
  control,
  getValues,
  defaultValues = [],
}: ScopesFieldProps) => {
  const [checkScope] = useCheckScopeMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scope, setScope] = useState("");
  const { data: availableScopes } = useFetchAvailableScopesQuery();
  const { append, remove } = useFieldArray({ name, control });
  const scopes = getValues(name) || defaultValues;
  const addScope = async () => {
    const { error, message } = await checkScope({ scopes: [scope] }).unwrap();
    if (error) {
      setErrorMessage(message);
      return;
    }
    append(`/${trim(scope, "/")}/`);
    setErrorMessage(null);
    setScope("");
  };
  return (
    <>
      <Autocomplete
        freeSolo
        disableClearable
        options={availableScopes || []}
        value={scope}
        onInputChange={(e, scope) => setScope(scope)}
        onKeyUp={(e) => {
          if (e.key === "Enter") {
            addScope();
          }
        }}
        renderInput={(params) => (
          <TextField
            error={!!errorMessage}
            {...params}
            label="Scopes"
            helperText={errorMessage || "Press enter to add a new scope to share this resource. It will only be visible to roles with corresponding scopes set"}
          />
        )}
      />
      <Stack flexDirection="row" gap={1} flexWrap="wrap" width="100%" m={1}>
        {scopes.map((scope, index) => (
          <Chip key={index} label={scope} onDelete={() => remove(index)} />
        ))}
      </Stack>
    </>
  );
};

export default ScopesField;
