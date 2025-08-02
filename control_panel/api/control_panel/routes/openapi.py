import logging
import jsonref

from typing import Literal, cast

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic.json_schema import models_json_schema

from control_panel.config import env
from control_panel.deps.auth import Auth, GetAuth, Depends
from trussed.models import AppDocument
from trussed.models.mail import Mail


def CheckReferenceAccess():
    def check(auth: Auth | None = GetAuth(required=False)):
        if env.bool('RESTRICT_API_REFERENCE', True):
            if not auth:
                raise HTTPException(status_code=404, detail='Not found')

    return Depends(check)


router = APIRouter(
    tags=['OpenAPI Specifications'],
    dependencies=[
        CheckReferenceAccess(),
    ],
)
log = logging.getLogger(__name__)
Deref = Literal['', 'base', 'clean']


@router.get('/openapi.json')
async def openapi(req: Request) -> dict:
    return cast(dict, req.app.openapi())


@router.get('/database.json')
def openapi_database(deref: Deref = ''):
    models = AppDocument.document_models
    models = [i for i in models if AppDocument in i.__bases__]

    schemas = models_json_schema(
        [(i, 'serialization') for i in models],
        ref_template='#/components/schemas/{model}',
    )[1]

    defs = schemas.get('$defs', {})

    openapi = {
        'openapi': '3.1.0',
        'info': {
            'title': 'Database',
            'version': '0.0.1',
        },
        'components': {
            'schemas': defs,
        },
    }

    if deref:
        openapi = jsonref.replace_refs(openapi, lazy_load=False)

        if deref == 'clean':
            names = {i.__name__ for i in models}
            defs = openapi['components']['schemas']

            for name in (*defs,):
                if name not in names:
                    defs.pop(name, None)

    return openapi


@router.get('/database')
async def spec_database_html(req: Request, deref: Deref = 'clean') -> HTMLResponse:
    root_path = req.scope.get('root_path', '').rstrip('/')
    openapi_url = root_path + f'/api/database.json?deref={deref}'
    return get_rapi_html(openapi_url=openapi_url)


@router.get('/reference')
async def spec_reference_html(req: Request) -> HTMLResponse:
    root_path = req.scope.get('root_path', '').rstrip('/')
    openapi_url = root_path + '/api/openapi.json'
    return get_rapi_html(openapi_url=openapi_url)


def get_rapi_html(openapi_url: str):
    html = f"""
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <script type="module" src="https://cdnjs.cloudflare.com/ajax/libs/rapidoc/9.3.8/rapidoc-min.js"></script>
      </head>
      <body>
        <rapi-doc
            spec-url = "{openapi_url}"
            theme = "light"
            nav-bg-color = "#fafbfc"
            primary-color = "#444444"
            bg-color = "#fafbfc"

            schema-style = "table"
            show-components = "true"
            show-header = "false"
            allow-authentication = "false"
            allow-server-selection = "false"
        >
        </rapi-doc>
      </body>
    </html>"""

    return HTMLResponse(html)
