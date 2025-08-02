import { Typography, TypographyProps } from "@mui/material";
import { round } from "lodash";

type PriceTypographyProps = TypographyProps & {
  value?: number;
  decimalCount: number;
  prefix?: string;
};

const PriceTypography = (props: PriceTypographyProps) => {
  const { value, decimalCount, prefix } = props;
  const roundedValue = round(value, decimalCount);
  return (
    <Typography {...props} fontFamily="Roboto, Helvetica, Arial, sans-serif">
      {prefix || ""}
      {typeof value === "undefined"
        ? "N/A"
        : roundedValue === 0
        ? "0.00"
        : roundedValue}
    </Typography>
  );
};

export default PriceTypography;
