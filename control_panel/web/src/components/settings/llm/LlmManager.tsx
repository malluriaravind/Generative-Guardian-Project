import {
  Box,
  CircularProgress,
  Stack,
  Step,
  StepLabel,
  Stepper,
} from "@mui/material";
import AccountLayout from "../../../layouts/account/AccountLayout";
// import LeftDrawer from "../../../components/settings/common/LeftDrawer";
import { ReactNode, useState } from "react";
import DataStep from "../../../components/settings/llm/DataStep";
import ModelStep from "../../../components/settings/llm/ModelStep";
import { useAppSelector } from "../../../store";
import { LlmResponse } from "../../../types/llm";

type LLMStepItem = {
  label: string;
  element: ReactNode;
};

type LlmManagerProps = {
  current: LlmResponse | null;
  isLoading: boolean;
};

const LlmManager = ({ current, isLoading }: LlmManagerProps) => {
  const [activeStep, setActiveStep] = useState(0);
  const nextStep = () => {
    setActiveStep(activeStep + 1);
  };

  const defaultModels = useAppSelector((state) => state.llm.models);

  const modelStep = (
    <ModelStep
      current={current}
      nextStep={nextStep}
      models={current?.models || defaultModels!}
    />
  );
  const steps: LLMStepItem[] = [
    {
      label: "Select LLM",
      element: <DataStep current={current} nextStep={nextStep} />,
    },
    { label: "Select Model/s", element: modelStep },
    { label: "Test and Close", element: modelStep },
  ];

  return (
    <AccountLayout
      broadcrumbs={["Home", "Settings", "Manage LLMs"]}
      drawer={null}
      leftPanel={null}
      subTitle={`Update LLM Provider${current ? ": " + current.name : ""}`}
      title="LLM provider"
    >
      {isLoading ? (
        <Stack alignItems={"center"}>
          <CircularProgress />
        </Stack>
      ) : (
        <Box
          sx={{
            marginTop: "16px",
            padding: "48px 32px",
            backgroundColor: "white",
            borderRadius: "8px",
            width: "100%",
          }}
        >
          <Box display="flex" flexDirection="row" gap="56px" width="100%">
            <Stepper
              activeStep={activeStep}
              orientation="vertical"
              sx={{ height: "fit-content" }}
            >
              {steps.map(({ label }) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <Box width="79%">{steps[activeStep].element}</Box>
          </Box>
        </Box>
      )}
    </AccountLayout>
  );
};

export default LlmManager;
