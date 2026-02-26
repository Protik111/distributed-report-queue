FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install


# We'll mount code with volumes instead
# COPY . .
# Don't build yet for development, we'll run code directly
# RUN pnpm build

EXPOSE 5000

CMD ["node", "dist/server.js"]