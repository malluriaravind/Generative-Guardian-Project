import {
  Button,
  Checkbox,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { useFetchRolesQuery } from "../../../api/roles";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useEffect, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import { Configuration as ConfigData } from "../../../types/configuration";

type Props = {
  control: Control;
  config: ConfigData;
  setValue: UseFormSetValue;
};

type RoleMappingRow = {
  sso_role: string;
  controller_roles: string[];
};

export const DefaultSsoRoles = ({ control, config }: Props) => {
  const { data: roles } = useFetchRolesQuery();
  const defaultValue = config.value.trim();
  return (
    <Stack mt={5}>
      <Controller
        name={config.name}
        control={control}
        defaultValue={
          defaultValue.length > 0 ? defaultValue.split(",") : []
        }
        render={({ field: { name, value, onChange } }) => (
          <FormControl variant="outlined" fullWidth>
            <InputLabel id="roles-label">Default RBAC roles</InputLabel>
            <Select
              id={name}
              multiple
              label="Default RBAC roles"
              labelId="roles-label"
              onChange={onChange}
              value={value ?? []}
              renderValue={() => value?.join(", ")}
            >
              {roles?.map((role) => (
                <MenuItem key={role._id} value={role.name}>
                  <Checkbox
                    checked={
                      (value ?? []).findIndex((el) => el === role.name) > -1
                    }
                  />
                  <ListItemText primary={role.name} secondary={role.comment} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      />
    </Stack>
  );
};

export const SsoRoleMapping = ({ config, setValue }: Props) => {
  const { data: roles } = useFetchRolesQuery();
  const [roleMapping, setRoleMapping] = useState<RoleMappingRow[]>([]);
  useEffect(() => {
    setRoleMapping(
      !config.extra
        ? []
        : Object.entries(config.extra).map(([sso_role, controller_roles]) => ({
            sso_role,
            controller_roles,
          })),
    );
  }, [setRoleMapping, config.extra]);
  const onDeleteRow = (row: RoleMappingRow) => {
    const values = roleMapping.filter((r) => r.sso_role !== row.sso_role);
    setRoleMapping(values);
    setValue(
      config.name,
      values.reduce(
        (acc, r) => ({ ...acc, [r.sso_role]: r.controller_roles }),
        {},
      ),
    );
  };
  const table = useMaterialReactTable({
    enableEditing: true,
    columns: [
      {
        header: "SSO Role",
        accessorKey: "sso_role",
      },
      {
        header: "RBAC Roles",
        accessorKey: "controller_roles",
        Cell: ({ cell }) => cell.getValue<string[]>().join(", "),
      },
    ],
    data: roleMapping,
    initialState: {},
    renderRowActions: ({ row, table }) => (
      <Tooltip title="Delete">
        <IconButton color="error" onClick={() => onDeleteRow(row.original)}>
          <DeleteIcon />
        </IconButton>
      </Tooltip>
    ),
  });
  const form = useForm<RoleMappingRow[]>();

  const onAddRowClick = ({ controller_roles, sso_role }: RoleMappingRow) => {
    const values = [
      ...roleMapping,
      { controller_roles: controller_roles, sso_role },
    ];
    setRoleMapping(values);
    setValue(
      config.name,
      values.reduce(
        (acc, r) => ({ ...acc, [r.sso_role]: r.controller_roles }),
        {},
      ),
    );
    form.reset({ sso_role: "", controller_roles: [] });
  };
  return (
    <Stack gap={8}>
      <Stack gap={2}>
        <Typography variant="body1">Role mapping</Typography>
        <MaterialReactTable table={table} />
        <Stack direction={"row"} gap={2}>
          <Controller
            name="sso_role"
            rules={{
              required: "SSO Role is required",
              minLength: { message: "Minimum length is 1", value: 1 },
            }}
            control={form.control}
            render={({ field: { name, onChange, value } }) => (
              <TextField
                name={name}
                onChange={onChange}
                value={value}
                fullWidth
                label="SSO Role"
              />
            )}
          />
          <Controller
            name="controller_roles"
            control={form.control}
            defaultValue={[]}
            render={({ field: { value, onChange } }) => (
              <FormControl variant="outlined" fullWidth>
                <InputLabel id="roles-label">RBAC Roles</InputLabel>
                <Select
                  id="roles"
                  multiple
                  label="RBAC Roles"
                  labelId="roles-label"
                  onChange={onChange}
                  value={value ?? []}
                  renderValue={() => value?.join(", ")}
                >
                  {roles?.map((role) => (
                    <MenuItem key={role._id} value={role.name}>
                      <Checkbox
                        checked={
                          (value ?? []).findIndex((el) => el === role.name) > -1
                        }
                      />
                      <ListItemText
                        primary={role.name}
                        secondary={role.comment}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />
          <Button
            variant="contained"
            onClick={form.handleSubmit(onAddRowClick)}
          >
            +
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
};
