#!/bin/bash

# Navigate to the directory where this script is located
cd "$(dirname "$0")"

echo "Starting Mediamammal backend server on http://localhost:3000..."
echo "You can close this terminal window to stop the server."

node ai_agent.js
