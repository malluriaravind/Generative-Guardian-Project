from .models import SpacyModelMetadata, get_models as get_spacy_models


def representative_metadata(i: SpacyModelMetadata) -> SpacyModelMetadata:
    i = SpacyModelMetadata(**i)

    # Simple way to extract language name
    name = i['description'].split()[0]

    match i['model'].rsplit('_', 1)[-1]:
        case 'sm':
            name += ' (small)'
        case 'lg':
            name += ' (large)'
        case 'trf':
            name += ' (transformer)'

    i['model'] = name

    if i['lang'] == 'xx':
        i['description'] = 'Used as a fallback multi-language model'
    else:
        i['description'] = ''

    return i


def getnaming():
    for i in get_spacy_models():
        yield i['model'], representative_metadata(i)['model']


model_to_name_dict = {model: name for model, name in getnaming()}
name_to_model_dict = {name: model for model, name in getnaming()}


def reprname_to_model(x: str) -> str:
    return name_to_model_dict.get(x, x)


def model_to_reprname(x: str) -> str:
    return model_to_name_dict.get(x, x)
