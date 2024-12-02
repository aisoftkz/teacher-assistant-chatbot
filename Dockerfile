# Dockerfile for teacherbot
FROM node:20

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose port (optional if needed for web integration)
EXPOSE 3000

# Command to start the application
CMD ["node", "src/app.js"]
