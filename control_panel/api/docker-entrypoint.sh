#!/bin/bash

set -e

start() {
    cp -r /app/control_panel/api/temp/static/ /app/control_panel/api/
    poetry run uvicorn control_panel:app --host 0.0.0.0 --port 8000 --proxy-headers --log-config log.yaml
}

help() {
    echo "Help"
}

case $1 in start|help)
    $1 ${@:2}
    ;;
*)
    exec $1 ${@:2}
    ;;
esac