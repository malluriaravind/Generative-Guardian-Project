import logging
import random
import asyncio

from pprint import pprint
from fastapi import APIRouter, Request


log = logging.getLogger(__name__)
router = APIRouter(prefix='/mock', tags=['Mocks'])


@router.post('/amlchat/score')
@router.post('/amlprompt/score')
async def amlorompt_score(body: dict, request: Request, sleep: float=0) -> dict:
    pprint(body)
    pprint(request.headers)

    await asyncio.sleep(sleep)

    if random.randint(0, 2):
        return {'output': 'Hello world!'}
    
    if random.randint(0, 1):
        return {'text': 'Unexpected text!'}

    return {'error': 'MOCKED ERROR'}


@router.post('/amlembedding/score')
async def amlembedding_score(body: dict, request: Request, sleep: float=0):
    pprint(body)
    pprint(request.headers)

    await asyncio.sleep(sleep)

    return [
        0.17916353046894073,
        -0.2163841277360916,
        -0.3171636164188385,
        0.10677263140678406,
        -0.2829395830631256,
        -0.4283522367477417,
        -0.389554500579834,
        0.4586333930492401,
        -0.3684207797050476,
        -0.2184344083070755,
    ]



@router.post('/chat/completions')
async def chat_completions(body: dict, request: Request, sleep: float = 0) -> dict:
    pprint(body)
    pprint(request.headers)
    await asyncio.sleep(sleep)

    return {
        'id': 'chatcmpl-43c2c2c7-c76b-4f59-b4fc-c5ea79369d25',
        'created': 1746725494,
        'model': None,
        'object': 'chat.completion',
        'system_fingerprint': None,
        'choices': [
            {
                'finish_reason': 'stop',
                'index': 0,
                'message': {
                    'content': 'HELLO WORLD!!!',
                    'role': 'assistant',
                    'tool_calls': None,
                    'function_call': None,
                },
            }
        ],
        'usage': {
            'completion_tokens': 0,
            'prompt_tokens': 0,
            'total_tokens': 0,
            'completion_tokens_details': None,
            'prompt_tokens_details': None,
        },
    }


