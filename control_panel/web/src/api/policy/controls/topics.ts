import { TopicsDescriptiveAction } from "../../../types/policy/controls/topics";
import { userApi } from "../../user";

const topicsControlApi = userApi.injectEndpoints({
    endpoints: (build) => ({
        getTopicsActions: build.query<TopicsDescriptiveAction[], void>({
            query: () => `/api/topics/descriptive-actions`,
        }),
        getTopicsSuggestions: build.query<string[], void>({
            query: () => `/api/topics/suggestions`,
        }),
    }),
    overrideExisting: false,
});

export const { useGetTopicsActionsQuery, useGetTopicsSuggestionsQuery } = topicsControlApi;
