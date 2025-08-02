FROM node:18.12.1 as webbuilder

LABEL MAINTAINER="trussed"

WORKDIR /web
COPY ./control_panel/web /web
RUN npm install &&\
    npm run rawbuild

FROM python:3.12.7-slim-bookworm@sha256:a866731a6b71c4a194a845d86e06568725e430ed21821d0c52e4efb385cf6c6f

RUN apt-get update && apt-get -y upgrade
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Environment variables if need to setup in dockerfile
# ENV JWT_SECRET=<JWT_SECRET>
# ENV DATABASE_URL='mongodb://localhost:27017'
# ENV DATABASE_NAME='trussed'
# ENV DATABASE_USER='root'
# ENV DATABASE_PASSWORD='password'
# ENV ENVIRONMENT='docker'
# ENV ROOT_USER_EMAIL='test@test.com'
# ENV ROOT_USER_PASSWORD='test123test123'

WORKDIR /app
COPY  ./control_panel/api  /app/control_panel/api
COPY ./control_panel/VERSION /app/control_panel/VERSION 
COPY ./pyproject.toml /app
COPY ./trussed /app/trussed
COPY --from=webbuilder /web/dist /app/control_panel/api/temp/static/
EXPOSE 8000

RUN chmod +x /app/control_panel/api/docker-entrypoint.sh
# RUN apt update -y && apt install -y gcc
RUN apt-get clean && rm -rf /var/lib/apt/lists/*
RUN pip3 install poetry &&\
    poetry config virtualenvs.create false

WORKDIR /app/control_panel/api
RUN poetry install --no-root

RUN ln -sf /dev/stdout /app/output.log
RUN ln -sf /dev/stderr /app/error.log

ENTRYPOINT [ "/app/control_panel/api/docker-entrypoint.sh" ]
CMD ["start"]