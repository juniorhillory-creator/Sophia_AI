#!/bin/bash
set -e

# Ensure permissions on mounted volume
mkdir -p /home/user/.ollama/models
chmod -R 777 /home/user/.ollama 2>/dev/null || true

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

# Ensure JWT RSA keypair exists
if [ ! -f "keys/private.pem" ]; then
    echo "Generating RSA keypair for JWT..."
    mkdir -p keys
    python3 -c "
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
with open('keys/private.pem', 'wb') as f:
    f.write(key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ))
with open('keys/public.pem', 'wb') as f:
    f.write(key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ))
"
    echo "RSA keypair generated."
fi

# Start FastAPI on port $PORT or 7860/8000
PORT="${PORT:-8000}"
echo "Starting Sophia AI on port $PORT..."
exec uvicorn app.main:create_app --factory --host 0.0.0.0 --port "$PORT"

