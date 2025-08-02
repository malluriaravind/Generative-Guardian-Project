import {
  Box,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  LinearProgress,
  ListItemText,
  MenuItem,
  Select,
  SwipeableDrawer,
  Typography,
} from "@mui/material";
import PasswordFormInput from "../common/PasswordFormInput";
import { FormInput } from "../common/FormInput";
import {
  changeAccountPasswordSchema,
  updateUserSchema,
} from "../../../schemas";
import {
  useChangeAccountPasswordMutation,
  useUpdateAccountMutation,
} from "../../../api/user";
import CloseIcon from "@mui/icons-material/Close";
import { PasswordFormHelper } from "../common/FormHelper";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Account } from "../../../types/account";
import { useFetchRolesQuery } from "../../../api/roles";
import ScopesField from "../../common/ScopesField";
import { CheckboxFormInput } from "../common/CheckboxFormInput";
import { useAppSelector } from "../../../store";

type UpdateUserForm = {
  firstName: string;
  lastName: string;
  email: string;
  assignedScopes?: (string | undefined)[] | null;
  scopes?: string[];
  roles?: (string | undefined)[] | null;
  is_root: boolean;
};

type UpdateUserPasswordForm = {
  newPassword: string;
  newPassword2: string;
};

type AccountUpdateDrawerProps = {
  isDrawerOpened: boolean;
  setIsDrawerOpen: (value: boolean) => void;
  account: Account;
};

const AccountUpdateDrawer = ({
  isDrawerOpened,
  setIsDrawerOpen,
  account,
}: AccountUpdateDrawerProps) => {
  const {
    control: userControl,
    handleSubmit: userHandleSubmit,
    reset: userFormReset,
    getValues
  } = useForm({
    resolver: yupResolver(updateUserSchema),
  });
  const {
    control: changePasswordControl,
    handleSubmit: changePasswordHandleSubmit,
    reset: changePasswordReset,
  } = useForm({
    resolver: yupResolver(changeAccountPasswordSchema),
  });

  const { is_root: isAuthorRoot } = useAppSelector(state => state.user);
  const { data: roles } = useFetchRolesQuery();
  const [updateAccount, { isLoading }] = useUpdateAccountMutation();
  const [changeAccountPassword] = useChangeAccountPasswordMutation();

  const onUserHandleSubmit = async (data: UpdateUserForm) => {
    await updateAccount({
      ...data,
      first_name: data.firstName,
      last_name: data.lastName,
      roles: data.roles ?? null,
    });
    userFormReset();
    setIsDrawerOpen(false);
  };

  const onPasswordHandleSubmit = async (data: UpdateUserPasswordForm) => {
    await changeAccountPassword({
      email: account.email,
      newPassword: data.newPassword,
    });
    changePasswordReset();
    setIsDrawerOpen(false);
  };

  return (
    <SwipeableDrawer
      anchor="right"
      open={isDrawerOpened}
      onClose={() => {setIsDrawerOpen(false)}}
      onOpen={() => {}}
    >
      {isLoading ? <LinearProgress /> : null}
      <Box
        display="flex"
        sx={{ backgroundColor: "#F5F5F5" }}
        padding={"24px"}
        flexDirection="column"
        height="100%"
        width="20vw"
      >
        <Box display="flex" flexDirection="row">
          <Typography fontSize="24px" fontStyle="normal" fontWeight="500">
            Update Account
          </Typography>
          <Button
            variant="grayed"
            style={{ marginLeft: "auto" }}
            onClick={() => {
              setIsDrawerOpen(false);
              userFormReset();
            }}
          >
            <CloseIcon />
          </Button>
        </Box>
        <Box
          sx={{ background: "white" }}
          borderRadius="8px"
          marginTop={"16px"}
          padding={"16px"}
          display="flex"
          justifyContent="center"
          flexDirection="column"
        >
          <Box display="flex" flexDirection="column" gap="32px" flexGrow="1">
            {isAuthorRoot ?
              <CheckboxFormInput
                label="Is root user"
                name="is_root"
                control={userControl}
                defaultValue={account.is_root}
                disabled={false}
              /> : null}
            <FormInput
              label="First Name"
              helperText="Provide your first name, so we can address you by name."
              placeholder="Eg.: John"
              name="firstName"
              control={userControl}
              defaultValue={account.first_name}
              disabled={false}
              inputType="text"
            />
            <FormInput
              label="Last Name"
              helperText="Share your last name for a more personalized experience."
              placeholder="Eg.: Doe"
              name="lastName"
              control={userControl}
              defaultValue={account.last_name}
              disabled={false}
              inputType="text"
            />
            <FormInput
              label="Email"
              placeholder="Eg.: johndoe@catmac.com"
              name="email"
              control={userControl}
              defaultValue={account.email}
              disabled={false}
              inputType="email"
            />
            <Controller
              name="roles"
              control={userControl}
              defaultValue={account.roles ?? []}
              render={({ field: { value, onChange } }) => (
                <FormControl variant="outlined" fullWidth>
                  <InputLabel id="roles-label">Roles</InputLabel>
                  <Select
                    id="roles"
                    multiple
                    label="Roles"
                    labelId="roles-label"
                    onChange={onChange}
                    value={value ?? []}
                    renderValue={() => value?.join(", ")}
                  >
                    {roles?.map((role) => (
                      <MenuItem key={role._id} value={role.name}>
                        <Checkbox
                          checked={
                            (value ?? []).findIndex((el) => el === role.name) >
                            -1
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
            <ScopesField control={userControl} defaultValues={account.scopes ?? []} name="scopes" getValues={getValues} />
            <Box marginTop="auto">
              <Button
                variant="contained"
                fullWidth
                onClick={userHandleSubmit(onUserHandleSubmit)}
              >
                <Typography>EDIT USER</Typography>
              </Button>
            </Box>
          </Box>
        </Box>
        <Box
          sx={{ background: "white" }}
          borderRadius="8px"
          marginTop={"16px"}
          padding={"16px"}
          display="flex"
          justifyContent="center"
          flexDirection="column"
        >
          <PasswordFormInput
            control={changePasswordControl}
            disabled={false}
            helperText={<PasswordFormHelper />}
            label="New Password"
            name="newPassword"
          />

          <PasswordFormInput
            control={changePasswordControl}
            disabled={false}
            helperText="Please retype your new password to make sure it matches."
            label="Confirm Password"
            name="newPassword2"
          />
          <Box marginTop="auto">
            <Button
              variant="contained"
              fullWidth
              onClick={changePasswordHandleSubmit(onPasswordHandleSubmit)}
            >
              <Typography>CHANGE USER PASSWORD</Typography>
            </Button>
          </Box>
        </Box>
      </Box>
    </SwipeableDrawer>
  );
};

export default AccountUpdateDrawer;
