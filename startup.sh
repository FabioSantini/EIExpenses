#!/bin/bash
cd /home/site/wwwroot

# Install dependencies if node_modules doesn't exist or is empty
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules)" ]; then
    echo "Installing dependencies..."
    npm install --production
fi

# Start the application
export PORT=8080
npm start