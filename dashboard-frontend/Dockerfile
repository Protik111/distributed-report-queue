FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json first for better caching
COPY package.json ./

# Install ALL dependencies (includes dev deps for vite)
RUN pnpm install

# Copy remaining source code
COPY . .

EXPOSE 5004
CMD ["pnpm", "dev"]