from trussed.env import env


def download_all():
    for i in env.list('SPACY_PII_MODELS', []):
        download_spacy(i)

    if model_id := env.str('TRF_INJECTIONS_MODEL_ID', ''):
        download_trf(model_id, env.str('TRF_INJECTIONS_MODEL_REV', None))

    if model_id := env.str('TRF_TOPICS_MODEL_ID', ''):
        download_trf(model_id, env.str('TRF_TOPICS_MODEL_REV', None))


def download_trf(
    model_id: str,
    revision: str | None = None,
    subfolder: str = 'onnx',
):
    from transformers import AutoTokenizer
    from optimum.onnxruntime import ORTModelForSequenceClassification

    AutoTokenizer.from_pretrained(
        model_id,
        revision=revision,
        force_download=False,
    )

    try:
        ORTModelForSequenceClassification.from_pretrained(
            model_id,
            revision=revision,
            subfolder=subfolder,
            # A workaround to prevent loading the model into RAM
            provider='NonExistentPorovider',
            force_download=False,
        )
    except ValueError as e:
        if 'provider' not in str(e).lower():
            raise


def download_spacy(model: str):
    from spacy.cli.download import download

    download(model)


if __name__ == '__main__':
    import sys
    import argparse

    env.read_envs()

    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest='command')

    update = commands.add_parser('all', help='Download all neccessary SpaCy and TRF models')

    args = parser.parse_args(args=(sys.argv[1:] or ['--help']))

    if args.command == 'all':
        download_all()
