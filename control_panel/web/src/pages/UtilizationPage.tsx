import AccountLayout from "../layouts/account/AccountLayout";
import UtilizationBody from "../components/utilization/UtilizationBody/UtilizationBody";

const UtilizationPage = () => {
  return (
    <AccountLayout
      title="Usage"
      subTitle=""
      drawer={null}
      leftPanel={null}
      broadcrumbs={["Home", "Usage"]}
    >
      <UtilizationBody />
    </AccountLayout>
  );
};

export default UtilizationPage;
