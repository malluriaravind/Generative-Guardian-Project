import { Configuration, ConfigurationUpdateRequest } from "../types/configuration";
import { userApi } from "./user";
  
const configurationApi = userApi.injectEndpoints({
    endpoints: (build) => ({
    fetchConfigurations: build.query<Configuration[], void>({
        query: () => ({ url: `/api/cfg/fetch` }),
        providesTags: ["configuration"],
    }),
    updateConfiguration: build.mutation<void, ConfigurationUpdateRequest[]>({
        query: (body) => ({
        url: `/api/cfg/update`,
        method: "POST",
        body,
        }),
        invalidatesTags: ["configuration"],
    }),
    customSubmitConfiguration: build.mutation<{message: string, error?: string}, {url: string, body: ConfigurationUpdateRequest[]}>({
        query: ({url, body}) => ({
        url,
        method: "POST",
        body,
        }),
    })
    }),
    overrideExisting: false,
});

export const {
    useFetchConfigurationsQuery,
    useUpdateConfigurationMutation,
    useCustomSubmitConfigurationMutation,
} = configurationApi;
  