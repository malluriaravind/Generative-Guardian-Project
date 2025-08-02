import { Typography } from "@mui/material";

type PriceTypography2Props = {
  fontSize: string,
  fontWeight: string,
  decimalCount: number,
  value?: number,
};

const PriceTypography2 = ({ fontSize, decimalCount, fontWeight, value }: PriceTypography2Props) => {
  const formatValue = (val?: number) => {
    if (!val && val !== 0) return '0';
    const numericValue = Number(val);
    if (!isNaN(numericValue)) {
      if (numericValue >= 1000000) {
        return (numericValue / 1000000).toFixed(decimalCount) + "m";
      }
      if (numericValue >= 10000) {
        return (numericValue / 1000).toFixed(decimalCount) + "k";
      }
      return numericValue.toFixed(decimalCount);
    } else {
      console.error('Invalid numeric value:', val);
      return '';
    }
  };
  return (
    <Typography fontWeight={fontWeight} fontSize={fontSize}>
      {formatValue(value)}
    </Typography>
  );
};

export default PriceTypography2;