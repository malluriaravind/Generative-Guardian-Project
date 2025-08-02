from control_panel.utils.prefixdict import PrefixSearch


# fmt: off
models_pricing = {
    'gpt-4-1106-preview': (0.01, 0.03),
    'gpt-4-vision-preview': (0.01, 0.03),
    'gpt-4': (0.03, 0.06),
    'gpt-4-0613': (0.03, 0.06),
    'gpt-4-32k': (0.06, 0.12),
    'gpt-4-32k-0613': (0.06, 0.12),
    'gpt-4-0314': (0.03, 0.06),
    'gpt-4-32k-0314': (0.06, 0.12),
    'gpt-3.5-turbo': (0.0015, 0.002),
    'gpt-3.5-turbo-16k': (0.003, 0.004),
    'gpt-3.5-turbo-instruct': (0.0015, 0.002),
    'gpt-3.5-turbo-0613': (0.0015, 0.002),
    'gpt-3.5-turbo-16k-0613': (0.003, 0.004),
    'gpt-3.5-turbo-0301': (0.0015, 0.002),
    'babbage-002': (0.0004, 0.0004),
    'davinci-002': (0.0020, 0.0020),
    'text-ada-001': (0.0004, 0.0004),
    'text-babbage-001': (0.0005, 0.0005),
    'text-curie-001': (0.0020, 0.0020),
    'text-davinci-001': (0.0200, 0.0200),
    'text-davinci-002': (0.0200, 0.0200),
    'text-davinci-003': (0.0200, 0.0200),
    'ada': (0.0004, 0.0004),
    'babbage': (0.0005, 0.0005),
    'curie': (0.0020, 0.0020),
    'davinci': (0.0200, 0.0200),
    'code-davinci-002': (0.0, 0.0),
    'text-similarity-ada-001': (0.004, 0.004),
    'text-search-ada-doc-001': (0.004, 0.004),
    'text-search-ada-query-001': (0.004, 0.004),
    'code-search-ada-code-001': (0.004, 0.004),
    'code-search-ada-text-001': (0.004, 0.004),
    'text-similarity-babbage-001': (0.005, 0.005),
    'text-search-babbage-doc-001': (0.005, 0.005),
    'text-search-babbage-query-001': (0.005, 0.005),
    'code-search-babbage-code-001': (0.005, 0.005),
    'code-search-babbage-text-001': (0.005, 0.005),
    'text-similarity-curie-001': (0.020, 0.020),
    'text-search-curie-doc-001': (0.020, 0.020),
    'text-search-curie-query-001': (0.020, 0.020),
    'text-similarity-davinci-001': (0.200, 0.200),
    'text-search-davinci-doc-001': (0.200, 0.200),
    'text-search-davinci-query-001': (0.200, 0.200),
}

finetuning_pricing = {
    'babbage': (0.0016, 0.0016),
    'davinci': (0.0120, 0.0120),
    'gpt-3.5-turbo': (0.0120, 0.0160),
    'curie': (0.0120, 0.0120),
    'ada': (0.0016, 0.0016),
}
finetuning_pricing = {
    **finetuning_pricing,
    **{'ft:' + k: v for k, v in finetuning_pricing.items()},
}
prefixed_finetuning_pricing = PrefixSearch(finetuning_pricing)

# fmt: on


def get_model_price(modelname):
    if pricing := models_pricing.get(modelname):
        return pricing

    if pricing := prefixed_finetuning_pricing.get(modelname):
        return pricing[1]
