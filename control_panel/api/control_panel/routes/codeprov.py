import logging
import httpx

from typing import *
from pydantic import BaseModel
from fastapi import APIRouter

from trussed.models.policies import CodeProvenanceDataset

from ..deps.auth import GetAuth


log = logging.getLogger(__name__)
router = APIRouter(prefix='/codeprov', tags=['Code Provenance'])

DEFAULT_URL = 'https://github.com/Trussed-ai/codeprov-datasets/releases/download/{name}/{name}.tar.lzma'

datasets = [
    CodeProvenanceDataset(
        name='Python medium dataset (1.2 GB assets, 95M digests): starred or proprietary/copyleft licensed sources. Dataset name: python_block1_stackv2_md',
        language='Python',
        dataset='python_block1_stackv2_md',
        disabled=False,
    ),
    CodeProvenanceDataset(
        name='JavaScript medium dataset (2.3 GB assets, 205M digests): starred or proprietary/copyleft licensed sources. Dataset name: javascript_block1_stackv2_md',
        language='JavaScript',
        dataset='javascript_block1_stackv2_md',
        disabled=False,
    ),
    CodeProvenanceDataset(
        name='Java medium dataset (1.3 GB assets, 100M digests): starred or proprietary/copyleft licensed sources. Dataset name: java_block1_stackv2_md',
        language='Java',
        dataset='java_block1_stackv2_md',
        disabled=False,
    ),
]


@router.get('/datasets', dependencies=[GetAuth()])
async def language_list() -> list[CodeProvenanceDataset]:
    return datasets


class CheckCodeProvenanceDataset(TypedDict):
    dataset: str


class CheckCodeProvenancePolicy(BaseModel):
    datasets: list[CheckCodeProvenanceDataset] | None = None
    download_url: str | None = None



http_client = httpx.AsyncClient(timeout=5, follow_redirects=True)


async def get_artifact(url: str):
    async with http_client.stream('GET', url) as response:
        if response.status_code == 404:
            url2 = url+'.00' # Check for multifile artifact

            async with http_client.stream('GET', url2) as response2:
                if response2.status_code == 200:
                    url = url2
                    response = response2

    return url, response


@router.post('/connectivity-check', dependencies=[GetAuth()])
async def check(body: CheckCodeProvenancePolicy):
    if not body.datasets:
        return {
            'error': 'CodeprovNoDatasetsError',
            'message': 'You have not selected any dataset'
        }

    url_template = body.download_url or DEFAULT_URL
    error_count = 0
    messages = []

    for dataset in body.datasets:
        if '{name}' in url_template:
            url = url_template.format(name=dataset['dataset'])
        else:
            url = url_template + '/' + dataset['dataset']

        try:
            url, response = await get_artifact(url)
            message = f'{response.status_code} - {url}'
            error_count += response.status_code != 200

        except Exception as e:
            error_count += 1
            message = f'{type(e).__name__} - {url}'

        messages.append(message)
    
    return {
        'error': 'CodeprovConnectionError' if error_count else None,
        'message': '\n'.join(messages)
    }


