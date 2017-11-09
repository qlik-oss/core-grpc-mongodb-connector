FROM node:8-alpine

RUN apk add --no-cache libc6-compat

RUN mkdir -p /app/
WORKDIR /app/

# Install dependencies before copying src to make use of docker cache layering
COPY package.json ./
RUN npm install --quiet --production

COPY src src/

ENTRYPOINT ["node", "./src/index"]
