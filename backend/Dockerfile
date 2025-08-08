# Lightweight Node.js image for running the logging server
FROM node:20-alpine

# Create and use the application directory inside the container
WORKDIR /app

# Copy package definitions and install production dependencies only
# Using two steps allows Docker to cache node_modules unless package files change
COPY package.json package-lock.json* ./
RUN npm install --production && npm cache clean --force

# Copy the backend source code into the image
COPY . .

# Expose the port used by the logging server
EXPOSE 3000

# Start the server when the container launches
CMD ["node", "server.js"]
