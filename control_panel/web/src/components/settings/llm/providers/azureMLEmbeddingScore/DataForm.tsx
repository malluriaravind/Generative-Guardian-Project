import {
  Alert,
  Button,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
import { useGetDescriptiveTokenizersQuery } from "../../../../../api/llm";
import TimeoutField from "../../fields/TimeoutField";
import NumberField from "../../fields/NumberField";

const DataForm: React.FC<DataFormProps> = ({
  control,
  current,
}: DataFormProps) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "azuremlembeddingscore.headers",
  });

  const currentHeadersLength = current?.azuremlembeddingscore?.headers.length || 0;
  const [headerNameValue, setHeaderNameValue] = useState<NameValuePair>({
    name: "",
    value: "",
  });
  const { data: tokenizers } = useGetDescriptiveTokenizersQuery({ provider: 'AzureMLEmbeddingScore' });

  const handleAddHeaderBtn = () => {
    if (!headerNameValue.name || !headerNameValue.value) return;

    append({ name: headerNameValue.name, value: headerNameValue.value });
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Alert severity="info"><b>Tip:</b> To use the native interface, use the following endpoint: <b>{window.location.origin}/provider/azureml/embedding/score/{"<model>"}</b>  where {"<model>"} is a configured virtual model name</Alert>
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="azuremlembeddingscore.tokenizer"
            control={control}
            defaultValue={current?.azuremlembeddingscore?.tokenizer}
            render={({
              field: { name, value, onChange, ref },
              fieldState: { error },
            }) => (
              <FormControl
                fullWidth
                variant="standard"
                sx={{ marginTop: "15px", minWidth: 120 }}
              >
                <InputLabel id="tokenizer-label" error={!!error}>
                  Select Tokenizer
                </InputLabel>
                <Select
                  name={name}
                  labelId="tokenizer-label"
                  value={value}
                  label="Tokenizer"
                  onChange={(ev) => { onChange(ev); }}
                  renderValue={(selected) => selected.name}
                  error={!!error
                  }
                  inputRef={ref}
                >
                  {tokenizers?.map((item, index) => (
                    <MenuItem key={index} value={item}>{item.name}</MenuItem>
                  ))}
                </Select>
                <FormHelperText error={!!error}>
                  {error?.message || ""}
                </FormHelperText>
              </FormControl>
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="azuremlembeddingscore.embedding_endpoint"
            control={control}
            rules={{ required: "Embedding Endpoint is required" }}
            defaultValue={current?.azuremlembeddingscore?.embedding_endpoint}
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
            name="azuremlembeddingscore.authorization_header"
            control={control}
            defaultValue={current?.azuremlembeddingscore?.authorization_header || "Authorization"}
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
            name="azuremlembeddingscore.authorization_value"
            control={control}
            defaultValue={current?.azuremlembeddingscore?.authorization_value}
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
                        name={`azuremlembeddingscore.headers.${index}.name`}
                        control={control}
                        defaultValue={
                          currentHeadersLength > index ?
                            current?.azuremlembeddingscore?.headers[index].name : ""
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
                        name={`azuremlembeddingscore.headers.${index}.value`}
                        control={control}
                        defaultValue={
                          currentHeadersLength > index ?
                            current?.azuremlembeddingscore?.headers[index].value : ""
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
          name='azuremlembeddingscore'
          control={control}
          defaultValue={current?.azuremlembeddingscore?.timeout}
      />
      <NumberField
          name="azuremlembeddingscore.max_connections"
          control={control}
          defaultValue={current?.azuremlembeddingscore?.max_connections || 50}
          label="Maximum number of concurrent connections"
      />
      <NumberField
          name="azuremlembeddingscore.max_keepalive_connections"
          control={control}
          defaultValue={current?.azuremlembeddingscore?.max_keepalive_connections || 10}
          label=" Maximum number of idle connections maintained in the pool"
      />
    </>
  );
};

export default DataForm;
