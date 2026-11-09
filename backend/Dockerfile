# Multi-stage build for Sophia AI Backend on Hugging Face Spaces (16GB RAM Free Tier)
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -e .

# Production stage
FROM python:3.11-slim AS production

# Install runtime libraries and Ollama
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    poppler-utils \
    tesseract-ocr \
    zstd \
    && curl -fsSL https://ollama.com/install.sh | sh \
    && rm -rf /var/lib/apt/lists/*

# Setup user with UID 1000 (required for Hugging Face Spaces)
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    OLLAMA_MODELS=/home/user/.ollama/models \
    OLLAMA_NUM_GPU=0 \
    PORT=7860

WORKDIR $HOME/app

# Copy Python packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy app code and startup script
COPY --chown=user:user app/ ./app/
RUN mkdir -p ./keys
COPY --chown=user:user start.sh ./start.sh

# Create runtime directories with user ownership
RUN mkdir -p /home/user/app/data/documents \
             /home/user/app/data/chroma \
             /home/user/.ollama/models \
    && chown -R user:user /home/user \
    && chmod +x ./start.sh

EXPOSE 7860

CMD ["./start.sh"]
