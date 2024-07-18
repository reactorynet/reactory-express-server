FROM node:20.15-alpine

RUN echo "NODE Version:" && node --version
RUN echo "NPM Version:" && npm --version

RUN  apt-get update -y &&  apt-get -y install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

WORKDIR /

RUN mkdir reactory

COPY build/server/reactory-server-1.0.0.tar.gz /reactory

WORKDIR /reactory

RUN tar -xvzf reactory-server-1.0.0.tar.gz

RUN rm reactory-server-1.0.0.tar.gz

RUN yarn

CMD ["bin/serve.sh"]