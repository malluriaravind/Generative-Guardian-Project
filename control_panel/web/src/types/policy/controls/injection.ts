export type InjectionDescriptiveAction = {
    name: string;
    value: string;
};

export type InjectionPolicy = {
    action: string;
    threshold: number;
    custom_message: string;
};
