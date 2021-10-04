from node:10.16.3-stretch
RUN echo "NODE Version:" && node --version
RUN echo "NPM Version:" && npm --version

RUN  apt-get update &&  apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev