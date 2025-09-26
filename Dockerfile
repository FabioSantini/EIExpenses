# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy application source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
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

# Copy other necessary files
COPY startup.sh ./
COPY web.config ./

# Make startup script executable
RUN chmod +x startup.sh

# Create a non-root user to run the application
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Expose port
EXPOSE 3000

# Environment variables will be injected at runtime
ENV NODE_ENV=production
ENV PORT=3000

# Start the application with Node (standalone mode)
CMD ["node", "server.js"]