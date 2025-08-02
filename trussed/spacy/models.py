import json
import logging
import importlib.resources

from typing import TypedDict, Required
from collections import defaultdict
from pathlib import Path
from functools import cache

log = logging.getLogger(__name__)


class SpacyModelMetadata(TypedDict, total=False):
    model: Required[str]
    version: Required[str]
    lang: str
    size: str
    description: str


def load_model_metadata(source='./spacy-models'):
    """
    Load metadata for SpaCy models from https://github.com/explosion/spacy-models repository.

    Parameters:
    - directory (str): The directory with the repo to load metadata from. Defaults to 'spacy-models'.

    Returns:
    - list: A list of dictionaries containing model information sorted by language and size.
    """
    from spacy.about import __version__
    from spacy.cli.download import get_minor_version

    spacy_version = get_minor_version(__version__)

    compatibility = json.load(open(Path(source, 'compatibility.json')))
    compatibility = compatibility['spacy'][spacy_version]
    fields = SpacyModelMetadata.__annotations__.keys()
    loaded = []

    for model, versions in compatibility.items():
        versioned = f'{model}-{versions[0]}'

        try:
            meta = json.load(open(Path(source, 'meta', versioned + '.json')))
        except Exception as e:
            log.error(e)
            continue

        meta['model'] = model
        loaded.append(SpacyModelMetadata({k: meta[k] for k in fields}))

    langorder = defaultdict(int, xx=-2, en=-1)

    def key(i: SpacyModelMetadata):
        return langorder[i['lang']], i['lang'], i['size'].rjust(7)

    return sorted(loaded, key=key)


def dump_model_metadata(metadata=None, package='trussed.spacy'):
    metadata = metadata or load_model_metadata()
    file = importlib.resources.files(package).joinpath('models.json').open('w')
    json.dump(metadata, file, indent=4)


@cache
def get_models(package='trussed.spacy') -> list[SpacyModelMetadata]:
    file = importlib.resources.files(package).joinpath('models.json').open()
    return json.load(file)


@cache
def get_models_dict(package='trussed.spacy'):
    return {i['model']: i for i in get_models(package)}


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest='command')

    update = commands.add_parser('update', help='Update models.json inplace')
    update.add_argument('source', nargs='?', default='./spacy-models')

    args = parser.parse_args()

    if args.command == 'update':
        dump_model_metadata(load_model_metadata(args.source))
