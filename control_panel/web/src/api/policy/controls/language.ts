import { LanguageDescriptiveAction, Language } from "../../../types/policy/controls/language";
import { userApi } from "../../user";

const languageControlApi = userApi.injectEndpoints({
    endpoints: (build) => ({
        getLanguageActions: build.query<LanguageDescriptiveAction[], void>({
            query: () => `/api/languages/descriptive-actions`,
        }),
        getLanguages: build.query<Language[], void>({
            query: () => `/api/languages`,
        }),
    }),
    overrideExisting: false,
});

export const { useGetLanguageActionsQuery, useGetLanguagesQuery } = languageControlApi;
