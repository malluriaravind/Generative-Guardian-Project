export type LanguageDescriptiveAction = {
    name: string;
    value: string;
};

export type Language = {
    name: string;
    code: string;
};

export type LanguagePolicy = {
    action: string;
    allowed_languages: string[];
    custom_message: string;
};
