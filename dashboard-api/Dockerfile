FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json first for better caching
COPY package.json ./

# Install dependencies WITHOUT frozen-lockfile
RUN pnpm install

# Copy remaining source code
COPY . .

# Build TypeScript
RUN pnpm build

EXPOSE 5003
CMD ["pnpm", "start"]