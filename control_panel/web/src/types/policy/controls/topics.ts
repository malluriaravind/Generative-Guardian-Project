export type TopicsDescriptiveAction = {
    name: string;
    value: string;
};

export type Topic = {
    topic: string;
    threshold: number;
};

export type TopicsPolicy = {
    action: string;
    ban_topics: Topic[];
    custom_message: string;
};
