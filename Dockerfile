FROM node:10.19.0-alpine
WORKDIR /usr/app
COPY package.json .
RUN npm install --silent
COPY . .
RUN npm install -g nodemon --silent
EXPOSE 3000