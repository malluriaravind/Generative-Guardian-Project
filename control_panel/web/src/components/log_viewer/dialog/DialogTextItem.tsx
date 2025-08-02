import { Stack, TextField, Typography, Chip } from "@mui/material";
import { arrayToString, objectToString } from "../../../helpers";

const getConvertValueToString = (
  value: string | number | string[] | object
) => {
  if (Array.isArray(value)) return <Stack flexWrap='wrap' direction="row" gap="8px">{value.map(item => <Chip label={item} color='primary'/>)}</Stack>;
  else if (typeof value === "object") return objectToString(value);

  return value;
};

type DialogTextItemProps = {
  name: string;
  value: string | number | string[] | object;
};

const DialogTextItem = ({
  name,
  value,
}: DialogTextItemProps) => {
  return (
    <Stack
      bgcolor="rgba(0, 0, 0, 0.08)"
      borderRadius={1}
      flexDirection="row"
      flexGrow={1}
      gap={1}
      padding={1}
    >
      <Typography fontWeight="bold">{name}:</Typography>
      <Typography
        style={{
          wordWrap: "break-word",
        }}
        whiteSpace={"pre-line"}
      >
        {getConvertValueToString(value)}
      </Typography>
    </Stack>
  );
};

export default DialogTextItem;
