FROM node:20-alpine

WORKDIR /app

# Paketdateien zuerst für Layer-Caching
COPY package.json package-lock.json* ./

# Server-Datei explizit kopieren (achte auf Build-Context/.dockerignore)
COPY ./legacy/server.js ./server.js

RUN npm install --production && npm cache clean --force

# Restlichen Backend-Code
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
