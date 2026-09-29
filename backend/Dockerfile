FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for node-gyp & sharp if needed
RUN apk add --no-cache python3 make g++ vips-dev

# Copy package manifests and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose backend API port
EXPOSE 5000

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=5000

# Run entry point
CMD ["node", "server.js"]
