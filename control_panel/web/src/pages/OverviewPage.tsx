import AccountLayout from "../layouts/account/AccountLayout";
import OverviewBody from "../components/overview";
import { Button, Stack, Typography } from "@mui/material";
import { getISOLocalString } from "../utils/date";

const OverviewPage = () => {
  const today = getISOLocalString();
  const yesterday = getISOLocalString(-1, 'd');

  const Buttons = () => {
    return (
      <Stack direction="row" gap="1rem" justifyContent="flex-end" width="100%">
        {/* <Button
          color="primary"
          size="small"
          variant="contained"
          onClick={() => {}}
        >
          <Typography>View Recommendations</Typography>
        </Button> */}
        <Button
          color="primary"
          size="small"
          variant="outlined"
          onClick={async () => {
            window.location.href = `/api/logs/export?begin=${yesterday}&end=${today}`;
          }}
        >
          <Typography>Export Report</Typography>
        </Button>
      </Stack>
    );
  };

  return (
    <AccountLayout
      title="OVERVIEW"
      subTitle=""
      leftPanel={null}
      broadcrumbs={[]}
      drawer={{
        button: <Buttons />,
        drawerBody: null,
      }}
    >
      <OverviewBody />
    </AccountLayout>
  );
};

export default OverviewPage;
