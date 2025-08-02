import React from "react";
import { Box, Typography, Chip, Stack, Divider, useTheme } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import moment from "moment";

export type Issue = {
  title: string;
  description: string;
  created_at: string;
  priority: "High" | "Medium" | "Low";
};

type InformationBlocksListProps = {
  title: string;
  issues: Issue[];
};

const InformationBlocksList: React.FC<InformationBlocksListProps> = ({
  title,
  issues,
}) => {
  const theme = useTheme();

  const getIcon = (priority: string) => {
    switch (priority) {
      case "High":
        return (
          <ErrorOutlineIcon
            sx={{ color: theme.palette.error.main, opacity: 0.5 }}
          />
        );
      case "Medium":
        return (
          <WarningAmberIcon
            sx={{ color: theme.palette.warning.main, opacity: 0.5 }}
          />
        );
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "error";
      case "Medium":
        return "warning";
      case "Low":
        return "default";
      default:
        return "default";
    }
  };

  return (
    <Box p={3} borderRadius={2} border="1px solid #e0e0e0" bgcolor="#fff">
      {title && (
        <Typography variant="h6" fontWeight="bold" mb={2}>
          {title}
        </Typography>
      )}

      <Stack
        spacing={2}
        divider={<Divider />}
        sx={{
          maxHeight: 300,
          overflowY: "auto",
        }}
      >
        {issues.map((issue, index) => (
          <Box key={index}>
            <Box display="flex" alignItems="flex-start" gap={1}>
              {getIcon(issue.priority)}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {issue.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  {issue.description}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip
                    size="small"
                    label={moment(issue.created_at).local().format('YYYY-MM-DD HH:mm:ss')}
                    sx={{ backgroundColor: "#f5f5f5" }}
                  />
                  <Chip
                    size="small"
                    label={`${issue.priority} Priority`}
                    color={getPriorityColor(issue.priority)}
                    sx={{ opacity: 0.5 }}
                  />
                </Stack>
              </Box>
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

export default InformationBlocksList;
