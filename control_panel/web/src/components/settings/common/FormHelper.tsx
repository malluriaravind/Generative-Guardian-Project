import { Box, List, ListItem, Typography } from "@mui/material";

export const PasswordFormHelper = () => (
  <Box display="flex" flexDirection="column">
    <Typography
      fontSize="11px"
      fontStyle="normal"
      fontWeight="500"
      lineHeight="16px"
    >
      Create a strong password to keep your account secure. Here are some rules
      to follow:
    </Typography>
    <List
      sx={{
        listStyleType: "disc",
        pl: 2,
        "& .MuiListItem-root": {
          display: "list-item",
          padding: "0",
        },
      }}
    >
      <ListItem>
        <Typography
          fontSize="11px"
          fontStyle="normal"
          fontWeight="500"
          lineHeight="16px"
        >
          At least 8 characters long
        </Typography>
      </ListItem>
      <ListItem>
        <Typography
          fontSize="11px"
          fontStyle="normal"
          fontWeight="500"
          lineHeight="16px"
        >
          Include at least one uppercase letter
        </Typography>
      </ListItem>
      <ListItem>
        <Typography
          fontSize="11px"
          fontStyle="normal"
          fontWeight="500"
          lineHeight="16px"
        >
          Include at least one lowercase letter
        </Typography>
      </ListItem>
      <ListItem>
        <Typography
          fontSize="11px"
          fontStyle="normal"
          fontWeight="500"
          lineHeight="16px"
        >
          Include at least one number
        </Typography>
      </ListItem>
      <ListItem>
        <Typography
          fontSize="11px"
          fontStyle="normal"
          fontWeight="500"
          lineHeight="16px"
        >
          Include at least one special character, like !@#$% Example:
          MyP@ssw0rd!
        </Typography>
      </ListItem>
    </List>
  </Box>
);
