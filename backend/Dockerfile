# Use a lightweight Node image for the application
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy dependency files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the application source code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
