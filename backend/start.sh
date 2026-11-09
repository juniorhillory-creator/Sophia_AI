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

# Ensure the model is downloaded if not already cached
MODEL_NAME="${OLLAMA_MODEL:-llama3.2:1b}"
echo "Checking model $MODEL_NAME..."
if ! ollama list | grep -q "$MODEL_NAME"; then
    echo "Pulling model $MODEL_NAME..."
    ollama pull "$MODEL_NAME"
else
    echo "Model $MODEL_NAME already cached."
fi

# Start FastAPI on port $PORT or 7860/8000
PORT="${PORT:-8000}"
echo "Starting Sophia AI on port $PORT..."
exec uvicorn app.main:create_app --factory --host 0.0.0.0 --port "$PORT"

