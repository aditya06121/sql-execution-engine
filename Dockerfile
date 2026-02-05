# Use Node.js LTS
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./

RUN npm install --only=production

# Copy application source
COPY . .

# Create tmp directory for SQLite databases
RUN mkdir -p /app/tmp

# Expose application port
EXPOSE 6060

# Start the server
CMD ["node", "index.js"]
