# Multi-stage build for Sophia AI Backend
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

# Install runtime libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Setup runtime environment
ENV PATH=/usr/local/bin:$PATH \
    PORT=8000

WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy app code and startup script
COPY app/ ./app/
RUN mkdir -p ./keys
COPY start.sh ./start.sh

# Create runtime directories
RUN mkdir -p /app/data/documents \
             /app/data/chroma \
    && chmod +x ./start.sh

EXPOSE 8000

CMD ["./start.sh"]
