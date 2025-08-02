import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  LinearProgress,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  SwipeableDrawer,
  TextField,
  Typography,
} from "@mui/material";
import { Model, ModelPoolResponse } from "../../../types/modelpool";
import CloseIcon from "@mui/icons-material/Close";
import { Controller, useForm } from "react-hook-form";
import {
  useCreateModelPoolMutation,
  useFetchAvailableModelsQuery,
  useUpdateModelPoolMutation,
} from "../../../api/modelpool";
import {
  MRT_Row,
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import CommonTagsTextField from "../../common/CommonTagsTextField";
import ScopesField from "../../common/ScopesField";

type ModelPoolDrawerProps = {
  current: ModelPoolResponse | null;
  setCurrentModel: (model: ModelPoolResponse | null) => void;
  isDrawerOpened: boolean;
  setOpenDrawer: (value: boolean) => void;
};

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

const ModelPoolDrawer = ({
  current,
  isDrawerOpened,
  setCurrentModel,
  setOpenDrawer,
}: ModelPoolDrawerProps) => {
  const columns = useMemo<MRT_ColumnDef<Model>[]>(
    () => [
      {
        accessorKey: "llm_name",
        header: "Provider",
        size: 100,
      },
      {
        accessorKey: "alias",
        header: "Model",
        size: 100,
      },
    ],
    []
  );
  const availableModels = useFetchAvailableModelsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [createModelPool] = useCreateModelPoolMutation();
  const [updateModelPool] = useUpdateModelPoolMutation();
  const { control, handleSubmit, getValues } = useForm<ModelPoolResponse>({
    defaultValues: current || {},
  });
  const [enabledModelIds, setEnabledModelIds] = useState<string[]>(
    current?.models.map((el) => el.key) || []
  );
  let models: { [key: string]: Model } = {};
  if (availableModels.data) {
    models = Object.assign(
      {},
      ...availableModels.data.map((el) => ({ [el.key]: el }))
    );
  }
  const [modelsData, setModelsData] = useState<Model[]>([
    ...(current?.models || []),
  ]);
  const table = useMaterialReactTable({
    columns,
    data: modelsData,
    initialState: {},
    enableBottomToolbar: false,
    enableRowOrdering: true,
    enableSorting: false,
    muiRowDragHandleProps: ({ table }) => ({
      onDragEnd: () => {
        const { draggingRow, hoveredRow } = table.getState();
        if (hoveredRow && draggingRow) {
          modelsData.splice(
            (hoveredRow as MRT_Row<Model>).index,
            0,
            modelsData.splice(draggingRow.index, 1)[0]
          );
          setModelsData([...modelsData]);
        }
      },
    }),
  });

  const handleChange = (event: SelectChangeEvent<typeof enabledModelIds>) => {
    const {
      target: { value },
    } = event;
    const modelIds = typeof value === "string" ? value.split(",") : value;
    setEnabledModelIds(modelIds);
    setModelsData(modelIds.map((idd) => ({ ...models[idd], enabled: true })));
  };
  const onHandleSubmit = async (data: ModelPoolResponse) => {
    const request = { ...data, models: modelsData };
    if (current) {
      await updateModelPool({ ...request, id: current._id });
    } else {
      await createModelPool(request);
    }
    setOpenDrawer(false);
  };
  return (
    <SwipeableDrawer
      anchor="right"
      open={isDrawerOpened}
      onClose={() => {
        setOpenDrawer(false);
        setCurrentModel(null);
      }}
      onOpen={() => {}}
    >
      <Box
        display="flex"
        sx={{ backgroundColor: "#F5F5F5" }}
        padding={"24px"}
        flexDirection="column"
        height="100%"
        width="30em"
      >
        <Box display="flex" flexDirection="row">
          <Typography fontSize="24px" fontStyle="normal" fontWeight="500">
            {current ? "Edit Model Pool" : "Create Model Pool"}
          </Typography>
          <Button
            variant="grayed"
            style={{ marginLeft: "auto" }}
            onClick={() => {
              setOpenDrawer(false);
              setCurrentModel(null);
            }}
          >
            <CloseIcon />
          </Button>
        </Box>
        <Box
          sx={{ background: "white" }}
          borderRadius="8px"
          marginTop={"16px"}
          padding={"16px"}
          display="flex"
          justifyContent="center"
          flexDirection="column"
        >
          <Controller
            name="name"
            defaultValue={current?.name || ""}
            control={control}
            rules={{ required: "Name is required" }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <TextField
                variant="standard"
                label="Pool Name"
                error={!!error}
                onChange={onChange}
                value={value}
                helperText={error?.message}
              />
            )}
          />
          <Box mt={4}>
            <ScopesField control={control} defaultValues={current?.scopes || []} name="scopes" getValues={getValues} />
          </Box>
        </Box>
        <Box
          sx={{ background: "white" }}
          borderRadius="8px"
          marginTop={"16px"}
          padding={"16px"}
          display="flex"
          justifyContent="center"
          flexDirection="column"
        >
          <Controller
            name="virtual_model_name"
            defaultValue={current?.name || ""}
            control={control}
            rules={{ required: "Virtual model name is required" }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <TextField
                variant="standard"
                label="Virtual Model Name"
                error={!!error}
                onChange={onChange}
                value={value}
                helperText={error?.message}
              />
            )}
          />
          <Box marginTop="36px">
            <Box marginBottom="12px">
              <Typography color="gray">Model Priority</Typography>
            </Box>
            {availableModels.isLoading ? (
              <LinearProgress />
            ) : (
              <FormControl variant="standard" fullWidth>
                <InputLabel id="modelsselect">Select models</InputLabel>
                <Select
                  labelId="modelsselect"
                  id="modelsselectcontrol"
                  multiple
                  value={enabledModelIds}
                  renderValue={(selected) => {
                    return selected
                      .map(
                        (el) => `${models[el].llm_name} - ${models[el].alias}`
                      )
                      .join(", ");
                  }}
                  MenuProps={MenuProps}
                  onChange={handleChange}
                >
                  {(availableModels.data || []).map((value, index) => (
                    <MenuItem key={index} value={value.key}>
                      <Checkbox
                        checked={
                          enabledModelIds.findIndex((id) => id === value.key) >
                          -1
                        }
                      />
                      <ListItemText
                        primary={`${value.llm_name} - ${value.alias}`}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
          <CommonTagsTextField
            control={control}
            defaultTagsValue={current?.tags}
          />
          {/* <Box marginTop={1}>
            <FormControl>
              <Stack flexDirection="row" alignItems="center">
                <Controller
                  name="fanout"
                  control={control}
                  defaultValue={current?.fanout || false}
                  render={({ field: { name, onChange, value } }) => (
                    <Checkbox name={name} onChange={onChange} checked={value} />
                  )}
                />
                <Typography>Fanout</Typography>
              </Stack>
            </FormControl>
          </Box> */}
          <Box marginTop="16px">
            <Box my="14px">
              <Typography color="gray">Failover Priority</Typography>
            </Box>
            <MaterialReactTable table={table} />
          </Box>
        </Box>
        <Box marginTop="auto">
          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit(onHandleSubmit)}
          >
            <Typography>Save</Typography>
          </Button>
        </Box>
      </Box>
    </SwipeableDrawer>
  );
};

export default ModelPoolDrawer;
