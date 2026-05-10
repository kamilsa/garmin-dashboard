FROM node:22-alpine

WORKDIR /app

COPY dashboard/server/package*.json ./
RUN npm ci --omit=dev

COPY dashboard/server/ ./

ENV DB_PATH=/data/garmin_data.db
ENV MAPBOX_TOKEN_FILE=/data/mapbox_token
ENV OLLAMA_URL=http://localhost:11434
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "index.js"]
