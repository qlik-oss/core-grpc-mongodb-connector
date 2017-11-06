FROM node:8
#RUN apk add --no-cache libc6-compat
RUN mkdir -p /app/
WORKDIR /app/
COPY package.json ./
COPY src src/
RUN npm install --quiet --production
EXPOSE "50051"
ENTRYPOINT ["node", "./src/index"]
