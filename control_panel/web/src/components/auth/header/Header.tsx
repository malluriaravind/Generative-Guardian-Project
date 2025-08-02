import { Grid, Link } from "@mui/material";

type HeaderProps = {
  isSignup: boolean;
};

const Header = ({ isSignup }: HeaderProps) => {
  return (
    <Grid padding="32px" container direction="row" alignItems="center">
      <Grid item>
        <img src="/generative-guardian-logo.svg" alt="Generative Guardian" />
      </Grid>
      {isSignup ? (
        <Grid item marginLeft="auto">
          Don't already have an account? <Link href="/">Log in</Link>
        </Grid>
      ) : (
        <Grid item marginLeft="auto">
          Don't have an account? <Link href="/signup">Sign up</Link>
        </Grid>
      )}
    </Grid>
  );
};

export default Header;
