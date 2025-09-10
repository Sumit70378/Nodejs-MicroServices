# Use a smaller Node.js image
FROM node:18-alpine AS base

# Set working directory
WORKDIR /usr/src/app

# Copy package files first (to leverage Docker layer caching)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose the app port (you can override per service in docker-compose.yml)
EXPOSE 3000

# Run the app
CMD ["node", "server.js"]
