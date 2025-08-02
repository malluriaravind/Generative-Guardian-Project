import AccountLayout from "../../layouts/account/AccountLayout";
import PasswordChange from "../../components/settings/profile/PasswordChange";

const PasswordPage = () => {
  return (
    <AccountLayout
      leftPanel={null}
      drawer={null}
      broadcrumbs={["Home", "Settings", "Security"]}
      subTitle="Update your security information"
      title="Security"
    >
      <PasswordChange />
    </AccountLayout>
  );
};

export default PasswordPage;
