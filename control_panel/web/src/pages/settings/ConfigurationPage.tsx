import AccountLayout from "../../layouts/account/AccountLayout";
import { useAppDispatch } from "../../store";
import { reset } from "../../slices/policy";
import Configuration from "../../components/settings/configuration/Configuration";

const ConfigurationPage = () => {
    const dispatch = useAppDispatch();
    dispatch(reset());
    return (
        <AccountLayout
            broadcrumbs={["Home", "Configuration"]}
            subTitle=""
            title="Configuration"
            drawer={null}
            leftPanel={null}
        >
            <Configuration></Configuration>
        </AccountLayout>
    );
};

export default ConfigurationPage;
