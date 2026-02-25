#!/bin/bash
echo "Starting The Tales Backend..."
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Install dependencies if needed
npm install

# Start the server
node server.js