import { InvisibleTextDescriptiveAction } from "../../../types/policy/controls/invisible-text";
import { userApi } from "../../user";

const invisibleTextControlApi = userApi.injectEndpoints({
    endpoints: (build) => ({
        getInvisibleTextActions: build.query<InvisibleTextDescriptiveAction[], void>({
            query: () => `/api/invisible-text/descriptive-actions`,
        }),

    }),
    overrideExisting: false,
});

export const { useGetInvisibleTextActionsQuery } = invisibleTextControlApi;
