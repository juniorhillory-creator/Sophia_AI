#!/bin/bash
set -e

# Start Ollama daemon in background
echo "Starting Ollama daemon..."
ollama serve &

# Wait until Ollama responds
echo "Waiting for Ollama to become available..."
until curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; do
    sleep 1
done
echo "Ollama is online."

# Ensure the model is downloaded
echo "Checking model llama3.2:1b..."
ollama pull llama3.2:1b

# Start FastAPI on port 7860 (Hugging Face default) or $PORT
PORT="${PORT:-7860}"
echo "Starting Sophia AI on port $PORT..."
exec uvicorn app.main:create_app --factory --host 0.0.0.0 --port "$PORT"

