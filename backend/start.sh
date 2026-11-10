#!/bin/bash
set -e

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

# Start FastAPI on port $PORT or 10000
PORT="${PORT:-10000}"
echo "Starting Sophia AI on port $PORT..."
exec uvicorn app.main:create_app --factory --host 0.0.0.0 --port "$PORT"
