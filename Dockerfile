FROM node:12-alpine
WORKDIR /usr/app
COPY package.json .
RUN npm install 
COPY . .
RUN npm install -g nodemon --silent
EXPOSE 3000