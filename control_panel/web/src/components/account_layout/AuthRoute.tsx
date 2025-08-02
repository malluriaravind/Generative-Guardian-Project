import React from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "../../store";

type AuthRouteProps = React.PropsWithChildren;

const AuthRoute = ({ children }: AuthRouteProps) => {
  const user = useAppSelector((state) => state.user);
  if (typeof user === "undefined" || !user || !user.accessToken) {
    return <Navigate to="/login" />;
  }
  return children;
};

export default AuthRoute;
