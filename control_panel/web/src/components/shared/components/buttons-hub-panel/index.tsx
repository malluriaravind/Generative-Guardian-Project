import React from "react";
import { Box, Typography, Button, Chip, Grid, Link } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

type BlockItem = {
  label: string;
  active?: boolean;
};

type ButtonHubPanelProps = {
  title?: string;
  blocks: BlockItem[];
  tagsTitle?: string;
  tags: string[];
  onViewAll?: () => void;
};

const ButtonsHubPanel: React.FC<ButtonHubPanelProps> = ({
  title,
  blocks,
  tagsTitle,
  tags,
  onViewAll,
}) => {
  return (
    <Box p={3} borderRadius={2} border="1px solid #e0e0e0" bgcolor="#fff">
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        {title && (
          <Typography variant="h5" fontWeight="bold">
            {title}
          </Typography>
        )}
        {onViewAll && (
          <Link component="button" onClick={onViewAll}>
            View All
          </Link>
        )}
      </Box>

      <Grid container spacing={1} mb={2}>
        {blocks.map((block, index) => (
          <Grid item key={index}>
            <Button
              variant="outlined"
              startIcon={
                block.active ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <RadioButtonUncheckedIcon color="disabled" />
                )
              }
              sx={{
                textTransform: "none",
                borderColor: block.active ? "#3A59D1" : "grey.300",
                color: block.active ? "#3A59D1" : "text.secondary",
                fontWeight: block.active ? "bold" : "500",
                bgcolor: block.active
                  ? "rgba(175, 221, 255, 0.5)"
                  : "transparent",
                padding: "24px 16px",
              }}
            >
              {block.label}
            </Button>
          </Grid>
        ))}
      </Grid>

      {tagsTitle && (
        <Typography
          variant="h6"
          fontWeight="bold"
          color="text.secondary"
          mb={1}
        >
          {tagsTitle}
        </Typography>
      )}

      <Box display="flex" flexWrap="wrap" gap={1}>
        {tags.map((tag, index) => (
          <Chip key={index} label={tag} variant="outlined" onClick={() => {}} />
        ))}
      </Box>
    </Box>
  );
};

export default ButtonsHubPanel;
