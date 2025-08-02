import AccountLayout from "../../layouts/account/AccountLayout";
// import LeftDrawer from "../../components/settings/common/LeftDrawer";
import ProfileDetail from "../../components/settings/profile/ProfileDetail";
// import PasswordChange from "../../components/settings/profile/PasswordChange";

const ProfilePage = () => {
  return (
    <AccountLayout
      leftPanel={null}
      drawer={null}
      broadcrumbs={["Home", "Settings", "Profile"]}
      subTitle="Update your personal information"
      title="Profile"
    >
      <ProfileDetail />
      {/* <PasswordChange /> */}
    </AccountLayout>
  );
};

export default ProfilePage;
