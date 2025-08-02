import { useAppDispatch } from "../../../../store";
import SensorsOutlinedIcon from "@mui/icons-material/SensorsOutlined";
import { setAlert } from "../../../../slices/alert";
import { CircularProgress, IconButton } from "@mui/material";
import { useTestLlmConnectionMutation } from "../../../../api/llm";

type LlmTestButtonProps = {
  llmId: string;
  status: "success" | "error" | "primary";
};

const LLmTestButton = ({ llmId, status }: LlmTestButtonProps) => {
  const dispatch = useAppDispatch();
  const [testLlmConnection, { isLoading }] = useTestLlmConnectionMutation();
  return isLoading ? (
    <CircularProgress color="primary" size="1.5rem" />
  ) : (
    <IconButton
      onClick={async () => {
        try {
          await testLlmConnection({ id: llmId }).unwrap();
          dispatch(
            setAlert({
              title: "",
              shouldRender: true,
              type: "success",
              message: "Provider test passed",
            })
          );
        }
        catch {}
      }}
    >
      <SensorsOutlinedIcon color={status} />
    </IconButton>
  );
};

export default LLmTestButton;
