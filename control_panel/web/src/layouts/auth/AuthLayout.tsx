import React from "react";
import Grid from "@mui/material/Grid";

type AuthLayoutProps = React.PropsWithChildren & {
  header?: React.ReactNode | null;
};

const AuthLayout = ({ header, children }: AuthLayoutProps) => {
  return (
    <Grid container direction="column">
      <Grid item>{header}</Grid>
      <Grid item width="100%" display="flex" justifyContent="center">
        {children}
      </Grid>
    </Grid>
  );
};

export default AuthLayout;
