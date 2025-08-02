import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { DataGrid, GridColDef, useGridApiRef } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { useCreateLlmMutation, useUpdateLlmMutation } from "../../../api/llm";
import { LlmResponse, ModelObject } from "../../../types/llm";
import { reset } from "../../../slices/llm";
import { useAppDispatch, useAppSelector } from "../../../store";
import { useNavigate } from "react-router-dom";
import { setAlert } from "../../../slices/alert";
import { ErrorData } from "../../../types/error";
import ModelsDrawer from "./ModelsDrawer";

interface IRowProps {
  enabled: boolean;
  name: string;
  alias: string;
  price_input: string;
  price_output: string;
  id: number;
}
interface GridError {
  status: number;
  data: ErrorData;
}

const columns: GridColDef[] = [
  {
    field: "name",
    editable: true,
    headerName: "Model name",
    minWidth: 145,
    maxWidth: 400,
  },
  {
    field: "alias",
    editable: true,
    headerName: "Custom name",
    minWidth: 200,
    maxWidth: 400,
  },
  {
    field: "price_input",
    headerName: "Input Pricing",
    editable: true,
    renderCell(params) {
      return (
        <>
          ${params.value}
          <Typography color="gray" fontSize="14px" fontWeight="400">
            / 1K tokens
          </Typography>
        </>
      );
    },
    minWidth: 150,
    maxWidth: 200,
  },
  {
    field: "price_output",
    editable: true,
    headerName: "Output Pricing",
    minWidth: 150,
    maxWidth: 200,
    renderCell(params) {
      return (
        <>
          ${params.value}
          <Typography color="gray" fontSize="14px" fontWeight="400">
            / 1K tokens
          </Typography>
        </>
      );
    },
  },
];

type ModelStepProps = {
  current: LlmResponse | null;
  nextStep: () => void;
  models: ModelObject[];
};

const ModelStep = ({ current, models, nextStep }: ModelStepProps) => {
  const navigate = useNavigate();
  const llm = useAppSelector((state) => state.llm);
  const rows = (models || llm.models).map((item, index) => ({
    id: index,
    ...item,
  }));
  const [displayedRows, setDisplayedRows] = useState<IRowProps[]>(rows);
  const initial_ids = displayedRows
    .filter((el) => el.enabled)
    .map((el) => el.id);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isLlmError, setIsLlmError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isModelDrawerOpened, setIsModelDrawerOpened] =
    useState<boolean>(false);
  const apiRef = useGridApiRef();
  const dispatch = useAppDispatch();
  const [createLlm] = useCreateLlmMutation();
  const [updateLlm] = useUpdateLlmMutation();

  const handleSubmit = async () => {
    const updatedModels = Array.from(
      apiRef.current.getSelectedRows().values()
    ).map((el) => ({ ...el, enabled: true }));

    try {
      const request = {
        ...llm,
        models: (updatedModels as ModelObject[]) || llm.models || [],
      };
      if (current) {
        await updateLlm({ ...request, _id: current?._id }).unwrap();
      } else {
        await createLlm(request).unwrap();
      }
      nextStep();
      setIsLoaded(true);
      setTimeout(() => {
        dispatch(reset());
        navigate("/settings/llmconfig");
      }, 3000);
    } catch (err) {
      const gridError = err as GridError;
      setIsLlmError(true);
      console.error(gridError);
      if (gridError.status && gridError.status === 422) {
        setErrorMessage(gridError.data.message);
        dispatch(
          setAlert({
            type: "error",
            message: gridError.data.message,
            shouldRender: true,
            title: "",
          })
        );
      }
    }
  };

  useEffect(() => {
    if (apiRef && apiRef.current) {
      initial_ids.forEach((el) => apiRef.current.selectRow(el));
    }
  }, [apiRef]);

  const openModelDrawer = () => {
    setIsModelDrawerOpened(true);
  };

  const handleAddNewModel = (newModel: ModelObject) => {
    setIsModelDrawerOpened(false);
    if (!newModel) return;

    const newId = displayedRows.length + 1;
    const newDisplayedRow: IRowProps = {
      ...newModel,
      id: newId,
    };
    apiRef.current.selectRow(newId);
    setDisplayedRows((prevState) => [...prevState, newDisplayedRow]);
  };

  return (
    <Box display="flex" flexDirection="column" gap="24px">
      <Stack direction={"row"}>
        <Stack direction={"column"} flexGrow={1}>
          <Typography fontSize="20px" fontWeight="500">
            Select Models
          </Typography>
          <Typography fontSize="14px" fontWeight="400" color="rgba(0,0,0,0.5)">
            Select models to import
          </Typography>
        </Stack>
        <Stack direction={"row"} justifyContent={"flex-end"}>
          <Button color="primary" variant="contained" onClick={openModelDrawer}>
            Add Model
          </Button>
        </Stack>
      </Stack>
      <DataGrid
        apiRef={apiRef}
        checkboxSelection
        keepNonExistentRowsSelected
        disableRowSelectionOnClick
        columns={columns}
        rows={displayedRows}
        density="compact"
        rowHeight={50}
        autoHeight
        hideFooter
      />
      <Box display="flex" gap="24px">
        <Button
          color="primary"
          variant="outlined"
          onClick={handleSubmit}
          disabled={isLoaded}
        >
          Next
        </Button>
        <Box width="100%">
          {isLoaded ? (
            <Alert severity="success" variant="filled">
              Imported models successfully
            </Alert>
          ) : !isLlmError ? null : (
            <Alert severity="error">
              {errorMessage || "Error during posting data"}
            </Alert>
          )}
        </Box>
      </Box>
      {isModelDrawerOpened && (
        <ModelsDrawer
          isDrawerOpened={isModelDrawerOpened}
          setOpenDrawer={setIsModelDrawerOpened}
          handleAddNewModel={handleAddNewModel}
        />
      )}
    </Box>
  );
};

export default ModelStep;
