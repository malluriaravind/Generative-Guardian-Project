import litellm

from functools import cache
from ..models.llm import Llm


def get_model_object(name: str):
    """
    Get new ModelObject by name from the known models.
    :param name: The name of the model
    :return: Initialized ModelObject instance
    """
    if model := get_known_models_cached().get(name):
        return Llm.ModelObject(model)

    return Llm.ModelObject(
        name=name,
        alias=name,
        price_input=0,
        price_output=0,
        enabled=False,
    )


def get_known_models(provider='') -> dict[str, Llm.ModelObject]:
    cached = get_known_models_cached(provider)
    return {k: Llm.ModelObject(v) for k, v in cached.items()}


@cache
def get_known_models_cached(provider='') -> dict[str, Llm.ModelObject]:
    name: str
    data: dict
    models: dict[str, Llm.ModelObject] = {}
    litellm_provider = provider.lower()

    for name, data in litellm.model_cost.items():
        if data.get('mode') not in ('chat', 'embedding'):
            continue

        if litellm_provider and data.get('litellm_provider') != litellm_provider:
            continue

        # Currently we ignore time-based pricing
        if 'input_cost_per_second' in data:
            continue

        name = name.rsplit('/', 1)[-1]

        if name in models:
            continue

        models[name] = Llm.ModelObject(
            name=name,
            alias=name,
            price_input=round(data.get('input_cost_per_token', 0) * 1000, 6),
            price_output=round(data.get('output_cost_per_token', 0) * 1000, 6),
            enabled=False,
        )

    return models
