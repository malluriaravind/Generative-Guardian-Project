import { Box, Typography } from "@mui/material";
import AccountLayout from "../../layouts/account/AccountLayout";
// import LeftDrawer from "../../components/settings/common/LeftDrawer";
import PolicyManager from "../../components/settings/policy/PolicyManager";
import steps from "../../components/settings/policy/steps";
import { useAppDispatch, useAppSelector } from "../../store";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { useCreatePolicyMutation, useGetPolicyQuery, useUpdatePolicyMutation } from "../../api/policy";
import { setData, setId } from "../../slices/policy";
import { setAlert } from "../../slices/alert";


const pageMap: { [key: string]: JSX.Element } = {
    'manage': <PolicyManager />,
    ...steps
};

export const PolicyUpdateConfigurationPage = () => {
    const { id } = useParams();
    const currentPolicy = useGetPolicyQuery({ id: id || "EmptyId" }, { refetchOnMountOrArgChange: true, refetchOnReconnect: true });
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (currentPolicy.data) {
            dispatch(setData(currentPolicy.data));
        }
    }, [currentPolicy, currentPolicy.data, dispatch]);

    useEffect(() => {
        if (id) {
            dispatch(setId(id));
        }
    }, [dispatch, id]);
    return <PolicyConfigurationPage />;
};

export const PolicyConfigurationPage = () => {
    const currentStep = useAppSelector(state => state.policy.currentStep);
    const current = useAppSelector(state => state.policy.current);
    const isFinished = useAppSelector(state => state.policy.isFinished);
    const id = useAppSelector(state => state.policy.id);
    const [createPolicy] = useCreatePolicyMutation();
    const [updatePolicy] = useUpdatePolicyMutation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (isFinished) {
            if (id) {
                updatePolicy({ id, ...current }).unwrap();
            }
            else {
                createPolicy(current).unwrap();
            }
            dispatch(setAlert({ message: `Policy ${id ? 'updated' : 'added'} successfully`, type: 'success', title: '', shouldRender: true }));
            setTimeout(() => { }, 3000);
            navigate(`/policies`);
        }
    }, [dispatch, navigate, isFinished]);

    return <AccountLayout
        broadcrumbs={["Home", "Policies"]}
        subTitle=""
        title="Policies"
        drawer={null}
        leftPanel={null}
    >
        <Box
            sx={{
                marginTop: "16px",
                padding: "48px 32px",
                backgroundColor: "white",
                borderRadius: "8px",
            }}
        >
            {pageMap[currentStep] ? pageMap[currentStep] : <Typography variant="h1">Not found</Typography>}
        </Box>
    </AccountLayout>;
};