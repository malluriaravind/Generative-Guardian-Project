import { Box, Typography } from "@mui/material";

type SymbolType = "up" | "down" | "along" | "empty";

type ArrowedNumberProps = {
  value: string | number;
  fontSize: string;
  trend: SymbolType;
  justifyContent?: "center" | "end";
};

const symbols: { [key: string]: { symbol: string; color: string } } = {
  up: { symbol: "▲", color: "#D32F2F" },
  down: { symbol: "▼", color: "#4CAF50" },
  along: { symbol: "━", color: "blue" },
  empty: { symbol: "", color: "" },
};

const ArrowedNumber = ({
  value,
  fontSize,
  trend,
  justifyContent,
}: ArrowedNumberProps) => {
  const { symbol, color } = symbols[trend];
  return (
    <Box
      display="flex"
      flexDirection="row"
      alignItems="center"
      justifyContent={justifyContent || "center"}
    >
      <Typography
        alignItems={"center"}
        textAlign={"center"}
        color={color}
        fontSize={"18px"}
        marginRight="0.5rem"
      >
        {symbol}
      </Typography>
      <Typography
        textAlign={"center"}
        alignItems={"center"}
        fontSize={fontSize}
      >
        {value}
      </Typography>
    </Box>
  );
};

export default ArrowedNumber;
