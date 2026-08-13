FROM node:18-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Gera o Prisma Client após instalar dependências
RUN npx prisma generate

COPY . .

EXPOSE 3333

CMD ["npm", "run", "dev"]
