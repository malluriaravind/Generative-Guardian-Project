import { Box, Typography, Button } from "@mui/material";

type NewPanelProps = {
  handleButtonClick: () => void;
};

const NewPanel = ({ handleButtonClick }: NewPanelProps) => {
  return (
    <Box
      sx={{ background: "url(/empty_panel_bg.png) no-repeat" }}
      width="100%"
      display="flex"
      flexDirection="row"
      borderRadius="5px"
      p="40px"
      mt="32px"
    >
      <img src="/alerts_empty.png" />
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        gap="24px"
      >
        <Box>
          <Typography
            fontSize="24px"
            fontWeight="500"
            color=" rgba(0, 0, 0, 0.75)"
          >
            Create your first alert!
          </Typography>
          <Typography
            fontSize="12px"
            fontWeight="400"
            color="rgba(0, 0, 0, 0.60)"
          >
            Get notified about your spend and budgets to be on track
          </Typography>
        </Box>
        <Button variant="contained" color="primary" onClick={handleButtonClick}>
          CREATE ALERT
        </Button>
      </Box>
    </Box>
  );
};

export default NewPanel;
