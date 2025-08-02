import React from "react";
import { Card, Typography, Box } from "@mui/material";

type DashboardCardProps = {
  title: string;
  icon?: React.ReactNode;
  content: string | number;
  subtext?: string;
  subtextColor?: string;
  highlightColor?: string;
  useBar?: boolean;
  barPercentageProgress?: number;
};

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  icon,
  content,
  subtext,
  subtextColor = "text.secondary",
  highlightColor = "#fdd835",
  useBar = false,
  barPercentageProgress = 0,
}) => {
  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 2, p: 2, minWidth: 200, flex: 1 }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
        {icon && <Box>{icon}</Box>}
      </Box>

      <Typography variant="h5" fontWeight={600} mt={1}>
        {content}
      </Typography>

      {subtext && !useBar && (
        <Typography variant="body2" sx={{ mt: 1 }} color={subtextColor}>
          {subtext}
        </Typography>
      )}

      {useBar && (
        <Box mt={2} height={6} bgcolor="#e0e0e0" borderRadius={2}>
          <Box
            height="100%"
            width={`${barPercentageProgress}%`}
            bgcolor={highlightColor}
            borderRadius={2}
          />
        </Box>
      )}
    </Card>
  );
};

export default DashboardCard;
