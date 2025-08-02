export type Configuration = {
    _id: string;
    name: string;
    value: string;
    description: string;
    builtin: boolean;
    secure: boolean;
    type: string;
    group: string;
    submit_url?: string;
    extra?: {[key: string]: any};
    one_of?: {name: string, value: string}[];
};  

export type ConfigurationUpdateRequest = {
    name: string;
    value: string;
    extra?: {[key: string]: any};
};  

export interface GroupedConfigurations {
    [key: string]: Configuration[];
}