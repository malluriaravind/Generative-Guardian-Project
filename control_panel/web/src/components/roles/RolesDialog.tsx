import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  CircularProgress,
  Stack,
  Chip,
  Autocomplete,
  FormHelperText,
  Alert,
} from "@mui/material";
import {
  Permission,
  Role,
  RoleRequest,
  ScopePermissions,
} from "../../types/roles";
import {
  useCreateRoleMutation,
  useFetchDescriptivePermissionsQuery,
  useUpdateRoleMutation,
} from "../../api/roles";
import { trim } from "../../utils/trim";
import { useCheckScopeMutation, useFetchAvailableScopesQuery } from "../../api/scopes";

interface Props {
  open: boolean;
  onClose: () => void;
  model?: Role;
}

const PERMISSION_COLUMNS = ["Create", "Read", "Update", "Delete", "Global"];

const RoleCreatorDialog: React.FC<Props> = ({ open, onClose, model }) => {
  const [checkScope] = useCheckScopeMutation();
  const {data: availableScopes} = useFetchAvailableScopesQuery();
  const [errorScopeMessage, setErrorScopeMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [comment, setComment] = useState<string | undefined>("");
  const [scopePermissions, setScopesPermissions] = useState<ScopePermissions[]>(
    [],
  );
  const [assignedScopes, setAssignedScopes] = useState<string[]>([]);
  const [scope, setScope] = useState("");
  const [updateRole] = useUpdateRoleMutation();
  const [createRole] = useCreateRoleMutation();

  const { data: permissions} =
    useFetchDescriptivePermissionsQuery();

  useEffect(() => {
    if (!permissions) return;

    setScopesPermissions(() =>
      permissions.map((scope) => {
        const match = model?.permissions?.find(
          (p) => p.namespace === scope.namespace,
        );

        return {
          ...scope,
          permissions: scope.permissions.map((perm) => ({
            ...perm,
            enabled: match
              ? match.permissions.includes(perm.name)
              : perm.enabled,
          })),
        };
      }),
    );

    if (model) {
      setName(model.name);
      setComment(model.comment);
      setAssignedScopes(model.assigned_scopes ?? []);
    } else {
      setName("");
      setComment("");
      setAssignedScopes([]);
    }
  }, [permissions, model]);

  const handleCheckboxChange = (
    scopeIndex: number,
    permName: string,
    checked: boolean,
  ) => {
    setScopesPermissions((prev) =>
      prev.map((scope, i) =>
        i === scopeIndex
          ? {
              ...scope,
              permissions: scope.permissions.map((perm) =>
                perm.name === permName ? { ...perm, enabled: checked } : perm,
              ),
            }
          : scope,
      ),
    );
  };

  const addNewScope = async () => {
    if (!scope.trim()) return;
    const {error, message} = await checkScope({scopes: [`/${trim(scope, "/")}/`]}).unwrap();
    if (error) {
      setErrorScopeMessage(message);
      return;
    }
    setAssignedScopes((prev) => [...prev, `/${trim(scope, "/")}/`]);
    setScope("");
    setErrorScopeMessage(null);
  };

  const onHandleSubmit = async () => {
      const permissions = scopePermissions?.map((scope): Permission => {
        return {
          namespace: scope.namespace,
          permissions: scope.permissions
            ?.filter((perm) => perm.enabled && perm.eligible)
            .map((item) => item.name),
        };
      });

      const request: RoleRequest = {
        ...model,
        name,
        comment,
        permissions,
        assigned_scopes: assignedScopes,
      };
      try {
        if (model) {
          await updateRole({
            _id: model._id,
            ...request,
          }).unwrap();
        } else {
          await createRole(request).unwrap();
        }
        onClose();
      } catch(e) { }
  };

  const tableRows = useMemo(() => {
    return scopePermissions?.map((scope, scopeIndex) => (
      <TableRow key={scopeIndex}>
        <TableCell align="center">
          <Typography fontWeight="bold">{scope.title}</Typography>
        </TableCell>
        {PERMISSION_COLUMNS.map((perm) => {
          const foundPermission = scope.permissions.find(
            (p) => p.name === perm,
          );
          return (
            <TableCell key={perm} align="center">
              {foundPermission && (
                <Checkbox
                  checked={foundPermission.enabled}
                  disabled={!foundPermission.eligible}
                  onChange={(e) =>
                    handleCheckboxChange(
                      scopeIndex,
                      foundPermission.name,
                      e.target.checked,
                    )
                  }
                />
              )}
            </TableCell>
          );
        })}
      </TableRow>
    ));
  }, [scopePermissions]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="lg">
      <DialogTitle>{model ? "Edit Role" : "Create Role"}</DialogTitle>
      <DialogContent>
        {typeof permissions === "undefined" ? (
          <CircularProgress />
        ) : (
          <Stack gap={2} mt={2}>
            <TextField
              label="Role Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              fullWidth
              multiline
              rows={Math.min(10, comment?.split('\n').length || 2)}
            />

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center"></TableCell>
                  {PERMISSION_COLUMNS.map((col) => (
                    <TableCell key={col} align="center">
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>{tableRows}</TableBody>
            </Table>
            <Stack
              flexDirection="row"
              gap={1}
              justifyContent={"center"}
            >
              <Autocomplete
                freeSolo
                disableClearable
                options={availableScopes || []}
                fullWidth
                inputValue={scope}
                onInputChange={(e, scope) => setScope(scope)}
                onKeyUp={(e) => {
                  if (e.key === "Enter") {
                    addNewScope();
                  }
                }}
                renderInput={(params) => <TextField error={!!errorScopeMessage} {...params} label="Assign Scope" helperText={errorScopeMessage || ""} />}
                />
              <Button variant="contained" onClick={addNewScope}>
                Add
              </Button>
            </Stack>
            <Stack flexDirection="row" gap={1} flexWrap="wrap" width="100%">
              {assignedScopes.map((el, index) => (
                <Chip
                  label={el}
                  onDelete={() =>
                    setAssignedScopes(
                      assignedScopes.filter((_, i) => i !== index),
                    )
                  }
                />
              ))}
            </Stack>
            <Alert severity="info">
              <Typography variant="subtitle2">
                Scope covers the set of resources that access applies to. Scope is structured in a parent-child relationship; each level of hierarchy is separated by the slash (/) character and makes the scope more specific.
                Set the "Global" permission if you want the role to bypass scopes and grant global visibility to all resources within the selected section.
              </Typography>
            </Alert>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onHandleSubmit}
          color="primary"
          disabled={!name}
        >
          {model ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoleCreatorDialog;
