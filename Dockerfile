# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Accept build arguments for Next.js public environment variables
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_APP_URL

# Set as environment variables for Next.js build
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy application source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application with public env vars baked in
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

# Install PM2 globally for process management
RUN npm install -g pm2

WORKDIR /app

# Copy package files and prisma schema first
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies and generate Prisma client
RUN npm ci --omit=dev && npx prisma generate

# Copy built application from builder stage (standalone output)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Create a non-root user to run the application
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Expose HTTP port
EXPOSE 3000

# Environment variables will be injected at runtime
ENV NODE_ENV=production
ENV PORT=3000

# Start the application using Next.js standalone server
CMD ["node", "server.js"]