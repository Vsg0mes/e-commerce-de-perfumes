FROM node:18-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3333

CMD ["npm", "run", "dev"]
