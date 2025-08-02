export type PiiModelRequest = {
    model: string;
    version: string;
};

export type PiiEntityRequest = {
    entity: string;
    entity_id: string | null;
};

export type PiiPolicy = {
    action: string;
    models: PiiModelRequest[];
    entities: PiiEntityRequest[];
    redaction_character: string;
};

export type PiiModelResponse = {
    model: string;
    lang: string;
    size: string;
    version: string;
    description: string;
};

export type PiiEntity = {
    _id: string | null;
    entity: string;
    description: string;
};

export type PiiDescriptiveAction = {
    name: string;
    value: string;
};

export type Pii = {
    entity: string;
    description: string;
    pattern: string;
    prerecognition_entity?: string | null;
    context_words: string[] | null;
};

export type PiiResponse = Pii & {
    _id: string;
    created_at: string;
    updated_at: string;
};

export type CreatePiiRequest = Pii;

export type UpdatePiiRequest = Pii & { id: string };