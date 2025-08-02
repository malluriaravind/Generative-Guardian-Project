import { Box } from "@mui/system";
import {
  useCustomSubmitConfigurationMutation,
  useFetchConfigurationsQuery,
  useUpdateConfigurationMutation,
} from "../../../api/configuration";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  Configuration as ConfigData,
  GroupedConfigurations,
} from "../../../types/configuration";
import { Controller, useForm } from "react-hook-form";
import { useAppDispatch } from "../../../store";
import { setAlert } from "../../../slices/alert";
import { possibleTrueValues } from "../../../constants";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { DefaultSsoRoles, SsoRoleMapping } from "./SsoRoles";

const Configuration = () => {
  const { data, isLoading, isFetching } = useFetchConfigurationsQuery();
  const [updateConfiguration] = useUpdateConfigurationMutation();
  const [customSubmitConfiguration] = useCustomSubmitConfigurationMutation();
  const { control, handleSubmit, getValues, setValue } = useForm<ConfigData>(
    {},
  );
  const [groupedConfigs, setGroupedConfigs] =
    useState<GroupedConfigurations | null>(null);
  const dispatch = useAppDispatch();

  const onHandleSubmit = async (data: ConfigData[]) => {
    var request = Object.entries(data)
      .filter(([_, value]) => typeof value != "undefined")
      .map(([name, value]) => ({ name, value: String(value), extra: typeof value === "object" && !Array.isArray(value) ? value : {}}));
    try {
      await updateConfiguration(request);

      dispatch(
        setAlert({
          type: "success",
          message: "Configurations were successfully saved",
          shouldRender: true,
          title: "",
        }),
      );
    } catch {
      dispatch(
        setAlert({
          type: "error",
          message: "Configurations were not saved",
          shouldRender: true,
          title: "",
        }),
      );
    }
  };

  useEffect(() => {
    const groupedConfigs = data?.reduce<GroupedConfigurations>(
      (grouped, cfg) => {
        if (!grouped[cfg.group]) {
          grouped[cfg.group] = [];
        }

        grouped[cfg.group].push(cfg);
        return grouped;
      },
      {},
    );

    setGroupedConfigs(groupedConfigs ?? null);
  }, [data]);

  const GenerateConfigField = () => {
    let component: any[] = [];

    const commonStyles = {
      sx: {
        padding: "8px 32px 16px",
        backgroundColor: "white",
        borderRadius: "8px",
      },
    };
    for (const key in groupedConfigs) {
      let sectionFields: any[] = [];
      groupedConfigs[key].forEach((cfg: ConfigData) => {
        const commonAttr = {
          name: cfg.name,
          fullWidth: true,
          label: cfg.name,
          sx: {
            marginTop: "24px",
          },
        };

        if (cfg.one_of) {
          sectionFields.push(
            <Controller
              name={cfg.name}
              key={cfg.name}
              defaultValue={cfg.value}
              control={control}
              render={({
                field: { onChange, value, name },
                fieldState: { error },
              }) => (
                <Box {...commonStyles}>
                  <FormControl
                    {...commonAttr}
                    variant="standard"
                    sx={{ marginTop: "24px" }}
                    fullWidth
                    error={!!error}
                  >
                    <InputLabel id="enum-select-label">{cfg.name}</InputLabel>
                    <Select
                      labelId="enum-select-label"
                      id="enum-select"
                      label="mode"
                      name={name}
                      value={value}
                      onChange={onChange}
                    >
                      {cfg.one_of.map((el) => (
                        <MenuItem value={el.value}>{el.name}</MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      {error ? error.message : cfg.description}
                    </FormHelperText>
                  </FormControl>
                </Box>
              )}
            />,
          );
          return;
        }

        switch (cfg.type) {
          case "submit":
            if (!cfg.submit_url) {
              break;
            }
            sectionFields.push(
              <Box key={cfg.name} {...commonStyles}>
                <Button
                  // TODO: move to separate file and add spinner
                  {...commonAttr}
                  type="button"
                  fullWidth={false}
                  variant="contained"
                  onClick={async () => {
                    const values = getValues();
                    var body = Object.entries(values)
                      .filter(([_, value]) => typeof value != "undefined")
                      .map(([name, value]) => ({ name, value: String(value) }));
                    try {
                      const response = await customSubmitConfiguration({
                        url: cfg.submit_url!,
                        body,
                      }).unwrap();
                      dispatch(
                        setAlert({
                          type:
                            typeof response.error === "undefined"
                              ? "success"
                              : "error",
                          message: response.message,
                          shouldRender: true,
                          title: "",
                        }),
                      );
                    } catch {
                      dispatch(
                        setAlert({
                          type: "error",
                          message: "Configurations were not saved",
                          shouldRender: true,
                          title: "",
                        }),
                      );
                    }
                  }}
                >
                  {cfg.description}
                </Button>
              </Box>,
            );
            break;
          case "string":
            sectionFields.push(
              <Controller
                name={cfg.name}
                key={cfg.name}
                defaultValue={cfg.value}
                control={control}
                render={({ field: { onChange, value, name } }) => (
                  <Box {...commonStyles}>
                    <TextField
                      {...commonAttr}
                      name={name}
                      value={value}
                      variant="standard"
                      helperText={cfg.description}
                      onChange={onChange}
                      type="text"
                    />
                  </Box>
                )}
              />,
            );
            break;
          case "boolean":
            let isTrueValue = possibleTrueValues.some(
              (x) => x === cfg.value.toLowerCase(),
            );
            sectionFields.push(
              <Controller
                name={cfg.name}
                key={cfg.name}
                defaultValue={isTrueValue}
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box {...commonStyles}>
                    <FormControlLabel
                      {...commonAttr}
                      checked={value}
                      onChange={onChange}
                      label={
                        <ListItemText
                          primary={cfg.name}
                          secondary={cfg.description}
                        />
                      }
                      control={<Checkbox />}
                    />
                  </Box>
                )}
              />,
            );
            break;
          case "number":
            sectionFields.push(
              <Controller
                name={cfg.name}
                key={cfg.name}
                defaultValue={cfg.value}
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box {...commonStyles}>
                    <TextField
                      {...commonAttr}
                      type="number"
                      variant="standard"
                      defaultValue={value}
                      helperText={cfg.description}
                      onChange={onChange}
                      value={value}
                    />
                  </Box>
                )}
              />,
            );
            break;
          case "role_mappings":
            sectionFields.push(
              <SsoRoleMapping
                config={cfg}
                control={control}
                setValue={setValue}
              />,
            );
            break;
          case "default_sso_roles":
            sectionFields.push(
              <DefaultSsoRoles
                config={cfg}
                control={control}
                setValue={setValue}
              />,
            );
            break;
          default:
            return <></>;
        }
      });

      component.push(WrapContentInAccordion(key, sectionFields));
    }

    return component;
  };

  const WrapContentInAccordion = (key: string, children: JSX.Element[]) => {
    return (
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} id={key}>
          {key}
        </AccordionSummary>
        <AccordionDetails>{children}</AccordionDetails>
      </Accordion>
    );
  };

  return isLoading || isFetching || !data ? (
    <CircularProgress />
  ) : (
    <Box
      marginTop={2}
      paddingX={4}
      paddingY={2}
      borderRadius={1}
      sx={{
        backgroundColor: "white",
      }}
    >
      {GenerateConfigField()}

      <Box marginTop={2}>
        <Button
          type="button"
          variant="contained"
          color="primary"
          onClick={handleSubmit(onHandleSubmit)}
        >
          SAVE
        </Button>
      </Box>
    </Box>
  );
};

export default Configuration;
