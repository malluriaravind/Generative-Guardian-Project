import { InjectionDescriptiveAction } from "../../../types/policy/controls/injection";
import { userApi } from "../../user";

const injectionControlApi = userApi.injectEndpoints({
    endpoints: (build) => ({
        getInjectionActions: build.query<InjectionDescriptiveAction[], void>({
            query: () => `/api/injection/descriptive-actions`,
        }),
    }),
    overrideExisting: false,
});

export const { useGetInjectionActionsQuery } = injectionControlApi;
