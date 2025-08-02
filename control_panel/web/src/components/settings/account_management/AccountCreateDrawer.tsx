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
import { createUserSchema } from "../../../schemas";
import { useCreateAccountMutation } from "../../../api/user";
import CloseIcon from "@mui/icons-material/Close";
import { PasswordFormHelper } from "../common/FormHelper";
import { Control, Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { CheckboxFormInput } from "../common/CheckboxFormInput";
import { useEffect } from "react";
import { generatePassword } from "../../../utils/password";
import { useFetchRolesQuery } from "../../../api/roles";
import ScopesField from "../../common/ScopesField";
import { useAppSelector } from "../../../store";

type CreateUserForm = {
  isSsoUser: boolean;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  password2: string;
  assignedScopes: (string | undefined)[] | null;
  roles: (string | undefined)[] | null;
  scopes: string[];
  is_root: boolean;
};

type AccountCreateDrawerProps = {
  isDrawerOpened: boolean;
  setIsDrawerOpen: (value: boolean) => void;
};

const AccountCreateDrawer = ({
  isDrawerOpened,
  setIsDrawerOpen,
}: AccountCreateDrawerProps) => {
  const { control, handleSubmit, reset, watch, setValue, getValues } =
    useForm<CreateUserForm>({
      resolver: yupResolver(createUserSchema),
    });
  const isSsoUser = watch("isSsoUser");
  const generatedPassword = generatePassword();
  const { is_root: isAuthorRoot } = useAppSelector(state => state.user);
  useEffect(() => {
    setValue("password", isSsoUser ? generatedPassword : "");
    setValue("password2", isSsoUser ? generatedPassword : "");
  }, [isSsoUser]);

  const { data: roles } = useFetchRolesQuery();
  const [createAccount, { isLoading }] = useCreateAccountMutation();
  const onHandleSubmit = async (data: CreateUserForm) => {
    await createAccount({
      ...data,
      first_name: data.firstName,
      last_name: data.lastName,
      roles: data.roles,
    });
    reset();
    setIsDrawerOpen(false);
  };

  return (
    <SwipeableDrawer
      anchor="right"
      open={isDrawerOpened}
      onClose={() => { setIsDrawerOpen(false) }}
      onOpen={() => { }}
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
            Create Account
          </Typography>
          <Button
            variant="grayed"
            style={{ marginLeft: "auto" }}
            onClick={() => {
              setIsDrawerOpen(false);
              reset();
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
            <CheckboxFormInput
              label="Is SSO user"
              name="isSsoUser"
              control={control}
              disabled={false}
              defaultValue={false}
            />
            {isAuthorRoot ?
              <CheckboxFormInput
                label="Is root user"
                name="is_root"
                control={control}
                disabled={false}
                defaultValue={false}
              /> : null}
            <FormInput
              label="First Name"
              helperText="Provide your first name, so we can address you by name."
              placeholder="Eg.: John"
              name="firstName"
              control={control}
              defaultValue=""
              disabled={false}
              inputType="text"
            />
            <FormInput
              label="Last Name"
              helperText="Share your last name for a more personalized experience."
              placeholder="Eg.: Doe"
              name="lastName"
              control={control}
              defaultValue=""
              disabled={false}
              inputType="text"
            />
            <FormInput
              label="Email"
              placeholder="Eg.: johndoe@catmac.com"
              name="email"
              control={control}
              defaultValue=""
              disabled={false}
              inputType="email"
            />
            <Controller
              name="roles"
              control={control}
              render={({ field: { value, onChange } }) => (
                <FormControl variant="outlined" fullWidth>
                  <InputLabel id="roles-label">Roles</InputLabel>
                  <Select
                    id="roles"
                    label="Roles"
                    labelId="roles-label"
                    multiple
                    onChange={onChange}
                    value={value ?? []}
                    renderValue={() => value?.map((el) => el).join(", ")}
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
            <ScopesField control={control} defaultValues={[]} name="scopes" getValues={getValues} />
            {!isSsoUser ? (
              <>
                <PasswordFormInput
                  control={control}
                  disabled={false}
                  helperText={<PasswordFormHelper />}
                  label="New Password"
                  name="password"
                />

                <PasswordFormInput
                  control={control}
                  disabled={false}
                  helperText="Please retype your new password to make sure it matches."
                  label="Confirm Password"
                  name="password2"
                />
              </>
            ) : null}
          </Box>
        </Box>
        <Box marginTop="auto">
          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit(onHandleSubmit)}
          >
            <Typography>CREATE USER</Typography>
          </Button>
        </Box>
      </Box>
    </SwipeableDrawer>
  );
};

export default AccountCreateDrawer;
