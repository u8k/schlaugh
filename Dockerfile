FROM node:10.19.0-alpine
WORKDIR /usr/app
RUN mkdir /usr/app/build
COPY package.json .
COPY yarn.lock .
RUN yarn install --silent --network-timeout 600000
COPY build .
RUN yarn global add nodemon --silent
EXPOSE 3000
