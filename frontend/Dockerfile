# ==============================================================================
# FORMLESS Frontend - Production Multi-Stage Dockerfile
# ==============================================================================

# Stage 1: Build & compile frontend bundle
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package.json package-lock.json ./

# Install exact requirements
RUN npm ci

# Copy source code and config
COPY . .

# Compile production bundle with Vite
RUN npm run build

# Stage 2: Serve compiled SPA via lightweight Nginx
FROM nginx:alpine

# Remove default static files
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Health check to ensure Nginx is serving
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://localhost/ || exit 1

# Launch Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
