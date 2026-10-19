FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma.config.js ./
COPY prisma ./prisma


RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npm run db:generate

COPY ./src ./src

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
