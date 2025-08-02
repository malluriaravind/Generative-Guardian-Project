import uvicorn
from control_panel.config import ENVIRONMENT

if __name__ == '__main__':
    uvicorn.run(
        'control_panel:app',
        host='0.0.0.0',
        port=8000,
        proxy_headers=True,
        log_config='log.yaml',
    )
