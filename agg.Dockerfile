FROM python:3.12.7-slim-bookworm@sha256:a866731a6b71c4a194a845d86e06568725e430ed21821d0c52e4efb385cf6c6f

ENV PYTHONDONTWRITEBYTECODE 1

# Env variables if needed to setup in dockerfile
# ENV DOMAIN=trussedproject.us.to
# ENV MONGODB_URL=mongodb://localhost:27017
# ENV MONGODB_NAME = trussed
# ENV SMTP_FROM = 'Trussed AI <alerts@trussed.ai>'
# ENV SMTP_HOST = <SMTP_HOST>
# ENV SMTP_PORT = 587
# ENV SMTP_USER = <SMTP_USER>
# ENV SMTP_PASSWORD = <SMTP_PASSWORD>

RUN apt-get update && apt-get -y upgrade
RUN apt-get install -y --no-install-recommends build-essential
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

COPY ./aggregator /app/aggregator
COPY ./trussed /app/trussed
COPY ./pyproject.toml /app

RUN pip3 install poetry && poetry config virtualenvs.create false

WORKDIR /app/aggregator
RUN poetry install --no-root

RUN ln -sf /dev/stdout /app/output.log
RUN ln -sf /dev/stderr /app/error.log

EXPOSE 7007

CMD ["poetry", "run", "uwsgi", "uwsgi.ini", "--socket", ":7007"] 