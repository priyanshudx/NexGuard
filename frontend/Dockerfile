# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN if [ -f package.json ]; then npm ci; fi

COPY . .

RUN if [ -f package.json ]; then npm run build; fi

# Stage 2: Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

USER node

EXPOSE 3000

CMD ["node", "-e", "console.log('NexGuard Frontend runner container ready. Awaiting Next.js application codebase.')"]
