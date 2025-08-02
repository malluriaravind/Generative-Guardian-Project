import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  LinearProgress,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Tail from "../Tail";
import { useAppDispatch, useAppSelector } from "../../../../store";
import {
  useGetCodeProvenceDatasetQuery,
  useLazyTestAccessibilityQuery,
} from "../../../../api/policy/controls/code-provenance";
import {
  CodeProvenceDataset,
  CodeProvencePolicy,
  CodeProvenceResponse,
} from "../../../../types/policy/controls/code-provenance";
import { SyntheticEvent, useState } from "react";
import { setData } from "../../../../slices/policy";

const CodeProvenance = () => {
  const current = useAppSelector(
    (state) => state.policy.current.code_provenance,
  );
  const dispatch = useAppDispatch();
  const { data: codeProvenceDataset, isLoading } =
    useGetCodeProvenceDatasetQuery();
  const [testAccessibility, {isFetching}] = useLazyTestAccessibilityQuery();
  const [accessbilityStatus, setAccessbilityStatus] = useState<{error: string | null, message: string} | null>(null);
  const [fullScanCheck, setFullScanCheck] = useState<boolean>(
    current?.fullscan ?? true,
  );

  const [metadataCheck, setMetadataCheck] = useState<boolean>(
    current?.add_metadata ?? true,
  );
  const [footnotesCheck, setFootnotesCheck] = useState<boolean>(
    current?.add_footnotes ?? true,
  );
  const [selectedDataset, setSelectedDataset] = useState<CodeProvenceDataset[]>(
    current?.datasets ?? [],
  );
  const [downloadUrl, setDownloadUrl] = useState<string>(
    current?.download_url ?? "",
  );

  const handleMetadataChange = (
    _event: SyntheticEvent<Element, Event>,
    checked: boolean,
  ) => {
    setMetadataCheck(checked);
  };
  const handleFootnotesChange = (
    _event: SyntheticEvent<Element, Event>,
    checked: boolean,
  ) => {
    setFootnotesCheck(checked);
  };
  const handleDataSetChange = (
    event: SelectChangeEvent<typeof selectedDataset>,
  ) => {
    let result = event.target.value as CodeProvenceResponse[];
    result = result.filter(
      (item, index, self) =>
        self.findIndex(
          (x, selfIndex) => x.dataset === item.dataset && index !== selfIndex,
        ) === -1,
    );
    setSelectedDataset(result);
  };
  const handleDownloadUrlChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setDownloadUrl(event.target.value);
  };

  const onNextStep = async (next: () => any) => {
    const onSubmit = async () => {
      const codeProvenceEntity: CodeProvencePolicy = {
        add_footnotes: footnotesCheck,
        add_metadata: metadataCheck,
        fullscan: fullScanCheck,
        datasets: selectedDataset,
        download_url: downloadUrl,
      };

      dispatch(
        setData({
          code_provenance: codeProvenceEntity,
        }),
      );

      next();
    };

    onSubmit();
  };

  const onTestAccessibilityClick = async () => {
      const response = await testAccessibility({
        datasets: selectedDataset,
        download_url: downloadUrl,
      }).unwrap();
      setAccessbilityStatus(response);
  };

  return (
    <Box display="flex" flexDirection="column" gap="16px">
      <Typography variant="h5">Code Provenance</Typography>
      {isLoading || !codeProvenceDataset ? (
        <LinearProgress />
      ) : (
        <FormControl variant="outlined" fullWidth>
          <Select
            multiple
            onChange={handleDataSetChange}
            value={selectedDataset}
            renderValue={() =>
              selectedDataset.map((el) => el.language).join(", ")
            }
          >
            {codeProvenceDataset?.map((item) => (
              <MenuItem value={item} key={item.dataset}>
                <Checkbox
                  checked={
                    selectedDataset.findIndex(
                      (el) => el.dataset === item.dataset,
                    ) > -1
                  }
                />
                <ListItemText primary={item.language} secondary={item.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      <Typography variant="h6">Flags</Typography>
      <FormControlLabel
        control={<Checkbox />}
        label="Add found attribution as footnotes into content (not applicable for FIM models)"
        checked={footnotesCheck}
        onChange={handleFootnotesChange}
      />
      <FormControlLabel
        control={<Checkbox />}
        label="Add found attribution as JSON into response"
        checked={metadataCheck}
        onChange={handleMetadataChange}
      />
      <FormControlLabel
        control={<Checkbox />}
        label="Scan for unfenced code blocks. Select this option for FIM (Fill-in-the-Middle) models"
        checked={fullScanCheck}
        onChange={() => setFullScanCheck(prev => !prev)}
      />
      <FormHelperText>{"Specify a custom URL to download dataset archives. The custom download URL may contain a {name} placeholder, which will be replaced with the dataset name at runtime. If the placeholder is not used, the dataset name will be appended to the end of the URL. The default download URL is: https://github.com/trussed-ai/codeprov-datasets/releases/download/{name}/{name}.tar.lzma"}</FormHelperText>
      <TextField
        fullWidth
        onChange={handleDownloadUrlChange}
        value={downloadUrl}
        label="Download Url"
      />
      {accessbilityStatus ? <Alert severity={accessbilityStatus.error ? "error" : "success"}>{accessbilityStatus.message}</Alert> : null}
      <Stack gap={1} flexDirection="row">
        { isFetching ? <CircularProgress />: <Button variant="contained" onClick={onTestAccessibilityClick}>
          Test Accessibility
        </Button>}
      </Stack>
      <Tail onNextClick={onNextStep} />
    </Box>
  );
};

export default CodeProvenance;
