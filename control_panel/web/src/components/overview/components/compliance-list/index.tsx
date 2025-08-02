import { CircularProgress } from "@mui/material";
import { useGetComplianceIssuesQuery } from "../../../../api/overview";
import InformationBlocksList from "../../../shared/components/information-blocks-list";

const ComplianceList = () => {
  const {data: issues} = useGetComplianceIssuesQuery();
  if(typeof issues === 'undefined') {
    return <CircularProgress />;
  }

  return <InformationBlocksList title="Compliance Issues" issues={issues} />;
};

export default ComplianceList;
