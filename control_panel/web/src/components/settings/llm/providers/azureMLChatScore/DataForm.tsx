import {
  Alert,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
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
    name: "azuremlchatscore.headers",
  });

  const [headerNameValue, setHeaderNameValue] = useState<NameValuePair>({
    name: "",
    value: "",
  });

  const currentHeadersLength = current?.azuremlchatscore?.headers.length || 0;
  const { data: tokenizers } = useGetDescriptiveTokenizersQuery({ provider: 'AzureMLChatScore' });

  const handleAddHeaderBtn = () => {
    if (!headerNameValue.name || !headerNameValue.value) return;

    append({ name: headerNameValue.name, value: headerNameValue.value });
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Alert severity="info"><b>Tip:</b> To use the native interface, use the following endpoint: <b>{window.location.origin}/provider/azureml/chat/score/{"<model>"}</b>  where {"<model>"} is a configured virtual model name</Alert>
        </Grid>
        <Grid item xs={12}>
          <FormControl>
            <FormControlLabel control={<Controller
              name="azuremlchatscore.openai_input"
              control={control}
              defaultValue={current?.azuremlchatscore?.openai_input || false}
              render={({ field: { name, onChange, value } }) => (
                <Checkbox name={name} onChange={onChange} checked={value} />
              )}
            />} label="Indicates whether the endpoint supports OpenAI input natively" />
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="azuremlchatscore.tokenizer"
            control={control}
            defaultValue={current?.azuremlchatscore?.tokenizer}
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
            name="azuremlchatscore.completion_endpoint"
            control={control}
            rules={{ required: "Completion Endpoint is required" }}
            defaultValue={current?.azuremlchatscore?.completion_endpoint}
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
            name="azuremlchatscore.authorization_header"
            control={control}
            defaultValue={current?.azuremlchatscore?.authorization_header || "Authorization"}
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
            name="azuremlchatscore.authorization_value"
            control={control}
            defaultValue={current?.azuremlchatscore?.authorization_value}
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
                        name={`azuremlchatscore.headers.${index}.name`}
                        control={control}
                        defaultValue={
                          currentHeadersLength > index ?
                            current?.azuremlchatscore?.headers[index].name : ""
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
                        name={`azuremlchatscore.headers.${index}.value`}
                        control={control}
                        defaultValue={
                          currentHeadersLength > index ?
                            current?.azuremlchatscore?.headers[index].value : ""
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
          name='azuremlchatscore'
          control={control}
          defaultValue={current?.azuremlchatscore?.timeout}
      />
      <NumberField
          name="azuremlchatscore.max_connections"
          control={control}
          defaultValue={current?.azuremlchatscore?.max_connections || 50}
          label="Maximum number of concurrent connections"
      />
      <NumberField
          name="azuremlchatscore.max_keepalive_connections"
          control={control}
          defaultValue={current?.azuremlchatscore?.max_keepalive_connections || 10}
          label=" Maximum number of idle connections maintained in the pool"
      />
    </>
  );
};

export default DataForm;
