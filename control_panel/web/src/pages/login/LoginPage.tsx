import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  FormControl,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Link,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Card,
  CardContent,
  Container,
} from "@mui/material";
import { useLoginMutation, useResetPasswordMutation } from "../../api/auth";
import { Controller, useForm } from "react-hook-form";
import {
  EmailFormInput,
  PasswordFormInput,
} from "../../components/auth/FormInputs";
import { yupResolver } from "@hookform/resolvers/yup";
import { loginSchema, resetPasswordSchema } from "../../schemas";
import AlertMessage from "../../components/AlertMessage";
import { useEffect, useState } from "react";
import { setAlert } from "../../slices/alert";
import { useDispatch } from "react-redux";
import { API_DOMAIN } from "../../constants";

interface LoginForm {
  email: string;
  password: string;
}

interface ResetPasswordForm {
  email: string;
}

interface LoginError {
  data: {
    field: string;
    message: string;
  };
}

const LoginPage = () => {
  const { handleSubmit, control, setError } = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
    resolver: yupResolver<LoginForm>(loginSchema),
  });
  const [login, { isLoading }] = useLoginMutation();
  const [resetPassword, { isLoading: isResetLoading }] =
    useResetPasswordMutation();
  const [isResetDialogOpen, setResetDialogOpen] = useState<boolean>(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  useEffect(() => {
    const errorMessage = searchParams.get("error");
    if (errorMessage) {
      dispatch(
        setAlert({
          shouldRender: true,
          title: errorMessage,
          message: errorMessage,
          type: "error",
        })
      );
    }
  }, [searchParams, dispatch]);

  const {
    handleSubmit: handleResetSubmit,
    control: resetControl,
    reset: resetResetForm,
  } = useForm<ResetPasswordForm>({
    defaultValues: { email: "" },
    resolver: yupResolver<ResetPasswordForm>(resetPasswordSchema),
  });

  const onHandleSubmit = async ({ email, password }: LoginForm) => {
    try {
      await login({
        email,
        password,
        rememberme: true,
      }).unwrap();
      navigate("/");
    } catch (err: unknown) {
      if ((err as LoginError).data) {
        const loginError = err as LoginError;
        setError(loginError.data.field as keyof LoginForm, {
          message: loginError.data.message,
        });
      }
    }
  };

  const onHandleResetSubmit = async ({ email }: ResetPasswordForm) => {
    try {
      const response = await resetPassword({ email }).unwrap();
      dispatch(
        setAlert({
          shouldRender: true,
          title: "Success",
          message: response.message,
          type: "success",
        })
      );
      resetResetForm();
      setResetDialogOpen(false);
    } catch (err: any) {
      dispatch(
        setAlert({
          shouldRender: true,
          title: "Error",
          message: err.data?.message || "Failed to reset password.",
          type: "error",
        })
      );
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 2
      }}
    >
      <AlertMessage />
      <Container maxWidth="md">
        <Card 
          elevation={24}
          sx={{ 
            borderRadius: 4,
            overflow: "hidden",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }}
        >
          <Grid container sx={{ minHeight: "500px" }}>
            {/* Left Panel - Branding */}
            <Grid
              item
              xs={12}
              md={6}
              sx={{
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                color: "white",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: 4,
                textAlign: "center",
                position: "relative",
                overflow: "hidden"
              }}
            >
              {/* Decorative elements */}
              <Box
                sx={{
                  position: "absolute",
                  top: "10%",
                  left: "10%",
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.1)",
                  opacity: 0.6
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  bottom: "20%",
                  right: "15%",
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.1)",
                  opacity: 0.4
                }}
              />
              
              {/* Logo and Title */}
              <Box sx={{ zIndex: 1 }}>
                <img 
                  src="/generative-guardian-logo.svg" 
                  alt="Generative Guardian"
                  style={{ 
                    maxWidth: "200px", 
                    marginBottom: "24px",
                    filter: "brightness(0) invert(1)"
                  }}
                />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700, 
                    marginBottom: 2,
                    background: "linear-gradient(45deg, #ffffff, #e0e7ff)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent"
                  }}
                >
                  Generative Guardian
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    opacity: 0.9,
                    lineHeight: 1.6,
                    maxWidth: "300px"
                  }}
                >
                  Secure and monitor your AI applications with advanced governance, 
                  real-time tracking, and intelligent cost management.
                </Typography>
              </Box>
            </Grid>

            {/* Right Panel - Login Form */}
            <Grid item xs={12} md={6}>
              <CardContent sx={{ padding: 4, height: "100%" }}>
                <Box
                  display="flex"
                  flexDirection="column"
                  justifyContent="center"
                  height="100%"
                  gap={3}
                >
                  <Box textAlign="center" mb={2}>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        marginBottom: 1
                      }}
                    >
                      Welcome Back
                    </Typography>
                    <Typography color="text.secondary" variant="body1">
                      Sign in to your Generative Guardian dashboard
                    </Typography>
                  </Box>

                  <form onSubmit={handleSubmit(onHandleSubmit)}>
                    <Box display="flex" flexDirection="column" gap={3}>
                      <FormControl fullWidth>
                        <EmailFormInput disabled={isLoading} control={control} />
                      </FormControl>
                      <FormControl fullWidth>
                        <PasswordFormInput disabled={isLoading} control={control} />
                      </FormControl>
                    </Box>

                    <Box display="flex" justifyContent="flex-end" mt={2} mb={3}>
                      <Button 
                        onClick={() => setResetDialogOpen(true)}
                        sx={{ 
                          textTransform: "none",
                          fontSize: "14px"
                        }}
                      >
                        Forgot password?
                      </Button>
                    </Box>

                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={isLoading}
                      sx={{
                        background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                        boxShadow: "0 10px 25px rgba(79, 70, 229, 0.3)",
                        borderRadius: 2,
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "16px",
                        py: 1.5,
                        "&:hover": {
                          background: "linear-gradient(135deg, #4338ca, #6d28d9)",
                          boxShadow: "0 15px 35px rgba(79, 70, 229, 0.4)",
                        }
                      }}
                    >
                      Sign In
                    </Button>
                    {isLoading && <LinearProgress sx={{ mt: 2 }} />}
                  </form>

                  <Box textAlign="center" mt={3}>
                    <Link
                      href={`${API_DOMAIN}/api/sso/`}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        textDecoration: "none",
                        color: "text.secondary",
                        "&:hover": {
                          color: "primary.main"
                        }
                      }}
                    >
                      <img src="/singlesignon.svg" alt="SSO" style={{ width: "20px" }} />
                      <Typography variant="body2">
                        Login with Single Sign-on
                      </Typography>
                    </Link>
                  </Box>
                </Box>
              </CardContent>
            </Grid>
          </Grid>
        </Card>

        <Typography
          color="rgba(255, 255, 255, 0.8)"
          fontSize="12px"
          textAlign="center"
          marginTop={3}
        >
          Copyright © 2023-2025 Generative Guardian. All rights reserved.
        </Typography>
      </Container>

      {/* Reset Password Dialog */}
      <Dialog 
        open={isResetDialogOpen} 
        onClose={() => setResetDialogOpen(false)}
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Reset Password</DialogTitle>
        <form onSubmit={handleResetSubmit(onHandleResetSubmit)}>
          <DialogContent>
            <Controller
              name="email"
              control={resetControl}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Email Address"
                  type="email"
                  fullWidth
                  variant="outlined"
                  error={!!error}
                  helperText={error?.message}
                  disabled={isResetLoading}
                  sx={{ mt: 1 }}
                />
              )}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button 
              onClick={() => setResetDialogOpen(false)}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={isResetLoading}
              sx={{ 
                textTransform: "none",
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)"
              }}
            >
              Send Reset Link
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default LoginPage;
