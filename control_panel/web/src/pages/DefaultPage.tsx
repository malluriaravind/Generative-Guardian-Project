import { SHOW_OVERVIEW_PAGE } from "../constants";
import { useAppSelector } from "../store";
import AppspendPage from "./AppspendPage";
import LoginPage from "./login/LoginPage";
import OverviewPage from "./OverviewPage";

const DefaultPage = () => {
  const accessToken = useAppSelector((state) => state.user.accessToken);
  if(accessToken === null) {
    return <LoginPage />;
  }
  return SHOW_OVERVIEW_PAGE ? <OverviewPage />: <AppspendPage />;
};

export default DefaultPage;
