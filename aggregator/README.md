# Trussed aggregator server

Run:
```sh
poetry run uwsgi uwsgi.ini
```

Example of `uwsgi_local.ini`:
```ini
[uwsgi]
socket = 127.0.0.1:7007
procname-prefix = trussed-aggregator-
```
