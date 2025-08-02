// import { useNavigate } from "react-router-dom";
// import AuthLayout from "../../layouts/auth/AuthLayout";
// import Header from "../../components/auth/header/Header";
// import {
//   Button,
//   FormControl,
//   FormControlLabel,
//   Checkbox,
//   TextField,
//   FormLabel,
//   Link,
//   Typography,
// } from "@mui/material";
// import styles from "./SignupPage.module.scss";
// import { useSignupMutation } from "../../api/auth";
// import { useState } from "react";
// import { UserCreationRequest } from "../../types/user";
// import { Roles } from "../../enums";

const SignupPage = () => {
  return <>Postponed</>;
  // const [signup, { isSuccess }] = useSignupMutation();
  // const [userData, setUserData] = useState<UserCreationRequest>({
  //   first_name: "",
  //   last_name: "",
  //   email: "",
  //   password: "",
  //   password2: "",
  //   role: Roles.User,
  // });
  // const handleInputChange = () => {
  //   setUserData(userData);
  // };
  // const navigate = useNavigate();
  // const onHandleSubmit = async () => {
  //   await signup(userData!);
  //   if (isSuccess) {
  //     alert("Account registered successfully");
  //     navigate("/login");
  //   }
  // };
  // return (
  //   <AuthLayout header={<Header isSignup={true} />}>
  //     <div className={styles.signup__container}>
  //       <img src="/logo.svg" />
  //       <p className={styles.signup__title}>Sign up</p>
  //       <form onSubmit={onHandleSubmit} className={styles.signup__body}>
  //         <FormControl margin="normal" required fullWidth>
  //           <FormLabel>First name</FormLabel>
  //           <TextField
  //             type="text"
  //             name="first_name"
  //             value={userData.first_name}
  //             onChange={handleInputChange}
  //           />
  //         </FormControl>
  //         <FormControl margin="normal" required fullWidth>
  //           <FormLabel>Last name</FormLabel>
  //           <TextField
  //             type="text"
  //             name="last_name"
  //             value={userData.last_name}
  //             onChange={handleInputChange}
  //           />
  //         </FormControl>
  //         <FormControl margin="normal" required fullWidth>
  //           <FormLabel>Email</FormLabel>
  //           <TextField
  //             type="text"
  //             name="email"
  //             value={userData.email}
  //             onChange={handleInputChange}
  //           />
  //         </FormControl>
  //         <FormControl margin="normal" required fullWidth>
  //           <FormLabel>Password</FormLabel>
  //           <TextField
  //             type="password"
  //             name="password"
  //             value={userData.password}
  //             onChange={handleInputChange}
  //           />
  //         </FormControl>
  //         <FormControl margin="normal" required fullWidth>
  //           <FormLabel>Confirm password</FormLabel>
  //           <TextField
  //             type="password"
  //             name="password2"
  //             value={userData.password2}
  //             onChange={handleInputChange}
  //           />
  //         </FormControl>
  //         <FormControlLabel
  //           control={<Checkbox value="remember" color="primary" />}
  //           label={
  //             <>
  //               I agree to <Link href="#">Terms & Conditions</Link>
  //             </>
  //           }
  //         />
  //         <Button
  //           type="button"
  //           fullWidth
  //           variant="contained"
  //           color="primary"
  //           onClick={onHandleSubmit}
  //         >
  //           <Typography
  //             fontFamily="Inter"
  //             fontSize="14px"
  //             fontWeight="600"
  //             padding="0"
  //           >
  //             Sign up
  //           </Typography>
  //         </Button>
  //       </form>
  //       <Typography fontSize="14" marginTop="25px" marginBottom="25px">
  //         or
  //       </Typography>
  //       <Button fullWidth variant="grayed">
  //         <svg
  //           xmlns="http://www.w3.org/2000/svg"
  //           className={styles.signup__icon}
  //           width="19"
  //           height="12"
  //           viewBox="0 0 19 12"
  //           fill="none"
  //         >
  //           <path
  //             d="M5.75322 8.31761C6.397 8.31761 6.94421 8.09228 7.39485 7.64164C7.84549 7.191 8.07082 6.64379 8.07082 6.00001C8.07082 5.35623 7.84549 4.80902 7.39485 4.35838C6.94421 3.90774 6.397 3.68241 5.75322 3.68241C5.12232 3.68241 4.57833 3.90774 4.12124 4.35838C3.66416 4.80902 3.43562 5.35623 3.43562 6.00001C3.43562 6.64379 3.66416 7.191 4.12124 7.64164C4.57833 8.09228 5.12232 8.31761 5.75322 8.31761ZM5.75322 11.2725C4.31116 11.2725 3.07511 10.7575 2.04506 9.72748C1.01502 8.69743 0.5 7.45495 0.5 6.00001C0.5 4.54507 1.0118 3.30259 2.03541 2.27254C3.05901 1.2425 4.29828 0.727478 5.75322 0.727478C6.84764 0.727478 7.84871 1.04615 8.75644 1.68349C9.66416 2.32083 10.2918 3.17383 10.6395 4.2425H16.6845L18.5 5.9807L15.7382 9.14808L14.0193 7.25537L12.3584 8.91632L11.2382 7.75752H10.6588C10.2983 8.81331 9.66787 9.6631 8.76754 10.3069C7.86721 10.9507 6.86243 11.2725 5.75322 11.2725Z"
  //             fill="#9E9E9E"
  //           />
  //         </svg>
  //         <Typography
  //           fontSize="14px"
  //           fontWeight="600"
  //           fontStyle="normal"
  //           fontFamily="Inter"
  //         >
  //           Sign up with SSO
  //         </Typography>
  //       </Button>
  //     </div>
  //   </AuthLayout>
  // );
};

export default SignupPage;
