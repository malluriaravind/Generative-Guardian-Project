import { Box, Button, LinearProgress, Typography, Alert } from "@mui/material";
import { PasswordFormHelper } from "../common/FormHelper";
import PasswordFormInput from "../common/PasswordFormInput";
import { useForm } from "react-hook-form";
import { useChangePasswordMutation } from "../../../api/user";
import { yupResolver } from "@hookform/resolvers/yup";
import { changePasswordSchema } from "../../../schemas";
import { useState, useEffect } from "react";

type PasswordForm = {
  oldPassword: string;
  newPassword: string;
  newPassword2: string;
};

const PasswordChange = () => {
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const { handleSubmit, control, reset } = useForm<PasswordForm>({
    resolver: yupResolver<PasswordForm>(changePasswordSchema),
  });
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const onHandleSubmit = async (data: PasswordForm) => {
    try {
      await changePassword({
        old_password: data.oldPassword,
        new_password: data.newPassword,
      }).unwrap();
      reset();
      setMessage({ text: "Password changed successfully!", type: 'success' });
    } catch (err: any) {
      setMessage({ 
        text: err?.data?.message || "An unexpected error occurred.", 
        type: 'error' 
      });
    }
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleCloseMessage = () => {
    setMessage(null);
  };

  return (
    <Box
      sx={{
        marginTop: "16px",
        padding: "48px 32px",
        backgroundColor: "white",
        borderRadius: "8px",
      }}
    >
      <Typography fontSize="24px">Security</Typography>
      <Typography fontSize="14px">Manage your password</Typography>
      {message && (
        <Box marginTop="16px">
          <Alert severity={message.type} onClose={handleCloseMessage}>
            {message.text}
          </Alert>
        </Box>
      )}
      <Box marginTop="32px" width="100%">
        <PasswordFormInput
          control={control}
          disabled={isLoading}
          helperText="Enter your current password"
          label="Current password"
          name="oldPassword"
        />
      </Box>
      <Box marginTop="32px" width="100%">
        <PasswordFormInput
          control={control}
          disabled={isLoading}
          helperText={<PasswordFormHelper />}
          label="New password"
          name="newPassword"
        />
      </Box>
      <Box marginTop="32px" width="100%">
        <PasswordFormInput
          control={control}
          disabled={isLoading}
          helperText="Please retype your new password to make sure it matches."
          label="Confirm password"
          name="newPassword2"
        />
      </Box>
      <Box marginTop="32px">
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit(onHandleSubmit)}
          disabled={isLoading}
        >
          SAVE
        </Button>
      </Box>
      {isLoading && <LinearProgress />}
    </Box>
  );
};

export default PasswordChange;
