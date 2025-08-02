import { Button, TextField, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { createRef } from "react";
import { useAppSelector } from "../../../store";
import { useChangeProfileInfoMutation } from "../../../api/user";
import { useDispatch } from "react-redux";
import { Profile } from "../../../types/user";
import { setProfile } from "../../../slices/user";

const ProfileDetail = () => {
  const firstNameRef = createRef<HTMLInputElement>();
  const lastNameRef = createRef<HTMLInputElement>();
  const emailRef = createRef<HTMLInputElement>();
  const user = useAppSelector((state) => state.user);
  const [changeProfile] = useChangeProfileInfoMutation();
  const dispatch = useDispatch();
  return (
    <Box
      sx={{
        marginTop: "16px",
        padding: "48px 32px",
        backgroundColor: "white",
        borderRadius: "8px",
      }}
    >
      <Typography fontSize="24px">Personal information</Typography>
      <Typography fontSize="14px">
        Update your personal information and account details
      </Typography>
      <TextField
        color="primary"
        variant="standard"
        label="First Name"
        size="medium"
        sx={{ marginTop: "32px", width: "100%" }}
        placeholder="E.g: John"
        helperText="Provide your first name, so we can address you by name."
        defaultValue={user.firstName}
        inputRef={firstNameRef}
      />
      <TextField
        type="text"
        variant="standard"
        label="Last Name"
        size="medium"
        sx={{ marginTop: "32px", width: "100%" }}
        placeholder="Eg.: Doe"
        helperText="Share your last name for a more personalized experience."
        defaultValue={user.lastName}
        inputRef={lastNameRef}
      />
      <TextField
        type="email"
        variant="standard"
        label="Email"
        size="medium"
        sx={{ marginTop: "32px", width: "100%" }}
        placeholder="Eg.: johndoe@catmac.com"
        helperText="Your email is your lifeline for updates and communication."
        defaultValue={user.email}
        inputRef={emailRef}
      />
      <Button
        variant="contained"
        color="primary"
        sx={{ marginTop: "24px" }}
        onClick={() => {
          const profile: Profile = {
            email: emailRef.current?.value || "",
            firstName: firstNameRef.current?.value || "",
            lastName: lastNameRef.current?.value || "",
          };
          changeProfile(profile).then(() => dispatch(setProfile(profile)));
        }}
      >
        Save
      </Button>
    </Box>
  );
};

export default ProfileDetail;
