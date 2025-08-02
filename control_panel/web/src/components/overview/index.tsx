import { Stack } from "@mui/material";
import Cards from "./components/cards";
import BuildingBlocks from "./components/building-blocks";
import ComplianceList from "./components/compliance-list";

const OverviewBody = () => {
  return (
    <Stack justifyContent="center" gap="1rem">
      <Cards />
      {/* <BuildingBlocks /> */}
      <ComplianceList />
    </Stack>
  );
};

export default OverviewBody;
