import {
  Button,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Controller, useFieldArray } from "react-hook-form";
import { DataFormProps } from "../DataFormFactory";
import { useState } from "react";
import { NameValuePair } from "../../../../../types/providers";
import DeleteIcon from "@mui/icons-material/Delete";
import TimeoutField from "../../fields/TimeoutField";
import NumberField from "../../fields/NumberField";

const DataForm: React.FC<DataFormProps> = ({
  control,
  current,
}: DataFormProps) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "openaicompatible.headers",
  });

  const currentHeadersLength = current?.openaicompatible?.headers.length || 0;

  const [headerNameValue, setHeaderNameValue] = useState<NameValuePair>({
    name: "",
    value: "",
  });

  const handleAddHeaderBtn = () => {
    if (!headerNameValue.name || !headerNameValue.value) return;

    append({ name: headerNameValue.name, value: headerNameValue.value });
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Controller
            name="openaicompatible.completion_endpoint"
            control={control}
            rules={{ required: "Completion Endpoint is required" }}
            defaultValue={current?.openaicompatible?.completion_endpoint}
            render={({
              field: { name, value, onChange },
              fieldState: { error },
            }) => (
              <TextField
                name={name}
                value={value}
                onChange={onChange}
                helperText={error?.message}
                error={!!error}
                fullWidth
                required
                label="Completion Endpoint"
                variant="outlined"
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="openaicompatible.embedding_endpoint"
            control={control}
            defaultValue={current?.openaicompatible?.embedding_endpoint || ""}
            render={({
              field: { name, value, onChange },
              fieldState: { error },
            }) => (
              <TextField
                name={name}
                value={value}
                onChange={onChange}
                helperText={error?.message}
                error={!!error}
                fullWidth
                required
                label="Embedding Endpoint"
                variant="outlined"
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="openaicompatible.authorization_header"
            control={control}
            defaultValue={current?.openaicompatible?.authorization_header || "Authorization"}
            render={({ field: { name, value, onChange } }) => (
              <TextField
                name={name}
                value={value}
                onChange={onChange}
                fullWidth
                label="Authorization Header"
                variant="outlined"
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="openaicompatible.authorization_value"
            control={control}
            defaultValue={current?.openaicompatible?.authorization_value}
            render={({ field: { name, value, onChange } }) => (
              <TextField
                name={name}
                value={value}
                onChange={onChange}
                fullWidth
                label="Authorization Value"
                variant="outlined"
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="h6">Headers</Typography>
        </Grid>
        <Grid item xs={5}>
          <TextField
            fullWidth
            label="Header Name"
            variant="outlined"
            onBlur={(e) =>
              setHeaderNameValue((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </Grid>
        <Grid item xs={5}>
          <TextField
            fullWidth
            label="Header Value"
            variant="outlined"
            onBlur={(e) =>
              setHeaderNameValue((prev) => ({ ...prev, value: e.target.value }))
            }
          />
        </Grid>
        <Grid item xs={2}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleAddHeaderBtn}
            sx={{ height: "100%" }}
          >
            Add
          </Button>
        </Grid>

        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fields.map((header, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Controller
                        name={`openaicompatible.headers.${index}.name`}
                        control={control}
                        defaultValue={
                          index > currentHeadersLength ?
                            current?.openaicompatible?.headers[index].name : ""
                        }
                        render={({ field: { name, onChange } }) => (
                          <TextField
                            name={name}
                            value={header.name}
                            onChange={onChange}
                            fullWidth
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        name={`openaicompatible.headers.${index}.value`}
                        control={control}
                        defaultValue={
                          index > currentHeadersLength ?
                            current?.openaicompatible?.headers[index].value : ""
                        }
                        render={({ field: { name, onChange } }) => (
                          <TextField
                            name={name}
                            value={header.value}
                            onChange={onChange}
                            fullWidth
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton color="error" onClick={() => remove(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
      <TimeoutField
          name='openaicompatible'
          control={control}
          defaultValue={current?.openaicompatible?.timeout}
      />
      <NumberField
          name="openaicompatible.max_connections"
          control={control}
          defaultValue={current?.openaicompatible?.max_connections || 50}
          label="Maximum number of concurrent connections"
      />
      <NumberField
          name="openaicompatible.max_keepalive_connections"
          control={control}
          defaultValue={current?.openaicompatible?.max_keepalive_connections || 10}
          label=" Maximum number of idle connections maintained in the pool"
      />
    </>
  );
};

export default DataForm;
