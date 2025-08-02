import {
  Stack,
  Button,
  SwipeableDrawer,
  TextField,
  Typography,
  Box,
} from "@mui/material";
import { useForm } from "react-hook-form";
import CloseIcon from "@mui/icons-material/Close";
import { Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { ModelObject } from "../../../types/llm";
import { modelSchema } from "../../../schemas";
import { isNumber } from "lodash";

type ModelDrawerProps = {
  isDrawerOpened: boolean;
  current?: ModelObject;
  setOpenDrawer: (value: boolean) => void;
  handleAddNewModel: (newRow: ModelObject) => void;
};

type ModelForm = {
  name: string;
  alias: string;
  price_input: number;
  price_output: number;
};

const ModelsDrawer = ({
  isDrawerOpened,
  current,
  setOpenDrawer,
  handleAddNewModel,
}: ModelDrawerProps) => {
  const mapModelObject = (model: ModelObject | undefined) => {
    if (!model) return;

    const mappedModel: ModelForm = {
      name: model.name,
      alias: model.alias,
      price_input:
        isNumber(model.price_input) && !isNaN(model.price_input)
          ? +model.price_input
          : 0,
      price_output:
        isNumber(model.price_output) && !isNaN(model.price_output)
          ? +model.price_output
          : 0,
    };

    return mappedModel;
  };

  const mappedModel = mapModelObject(current);

  const { control, reset, handleSubmit } = useForm({
    resolver: yupResolver(modelSchema),
    defaultValues: mappedModel,
  });

  const onHandleSubmit = async (data: ModelForm) => {
    const newModel: ModelObject = {
      enabled: true,
      name: data.name,
      alias: data.alias,
      price_input: data.price_input.toString(),
      price_output: data.price_output.toString(),
    };

    handleAddNewModel(newModel);
    setOpenDrawer(false);
  };

  return (
    <SwipeableDrawer
      anchor="right"
      open={isDrawerOpened}
      onClose={() => {
        setOpenDrawer(false);
        reset();
      }}
      onOpen={() => { }}
    >
      <Stack
        sx={{ backgroundColor: "#F5F5F5" }}
        padding={3}
        gap={1}
        height="100%"
        width="20vw"
      >
        <Stack flexDirection="row">
          <Typography fontSize="24px" fontStyle="normal" fontWeight="500">
            {current ? "Edit Model" : "Create Model"}
          </Typography>
          <Button
            variant="grayed"
            style={{ marginLeft: "auto" }}
            onClick={() => {
              setOpenDrawer(false);
            }}
          >
            <CloseIcon />
          </Button>
        </Stack>
        <Stack padding={2} borderRadius={1} sx={{ background: "white" }}>
          <Controller
            name="name"
            control={control}
            defaultValue={mappedModel?.name}
            render={({
              field: { name, value, onChange },
              fieldState: { error },
            }) => (
              <TextField
                name={name}
                value={value}
                error={!!error}
                variant="standard"
                label="Name"
                helperText={error?.message ?? ""}
                onChange={onChange}
              />
            )}
          />
        </Stack>
        <Stack padding={2} borderRadius={1} sx={{ background: "white" }}>
          <Controller
            name="alias"
            control={control}
            defaultValue={mappedModel?.alias}
            render={({
              field: { name, value, onChange },
              fieldState: { error },
            }) => (
              <TextField
                name={name}
                value={value}
                error={!!error}
                variant="standard"
                label="Alias"
                helperText={error?.message ?? ""}
                onChange={onChange}
              />
            )}
          />
        </Stack>
        <Stack padding={2} borderRadius={1} sx={{ background: "white" }}>
          <Controller
            name="price_input"
            control={control}
            defaultValue={mappedModel?.price_input}
            render={({
              field: { name, value, onChange },
              fieldState: { error },
            }) => (
              <TextField
                name={name}
                value={value}
                error={!!error}
                type="number"
                variant="standard"
                label="Price Input per 1K tokens"
                helperText={error?.message ?? ""}
                onChange={onChange}
              />
            )}
          />
        </Stack>
        <Stack padding={2} borderRadius={1} sx={{ background: "white" }}>
          <Controller
            name="price_output"
            control={control}
            defaultValue={mappedModel?.price_output}
            render={({
              field: { name, value, onChange },
              fieldState: { error },
            }) => (
              <TextField
                name={name}
                value={value}
                error={!!error}
                type="number"
                variant="standard"
                label="Price Output per 1K tokens"
                helperText={error?.message ?? ""}
                onChange={onChange}
              />
            )}
          />
        </Stack>
        <Box marginTop="auto">
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit(onHandleSubmit)}
          >
            SET MODEL
          </Button>
        </Box>
      </Stack>
    </SwipeableDrawer>
  );
};

export default ModelsDrawer;
