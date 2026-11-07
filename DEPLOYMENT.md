# Sophia AI — Deployment Guide

## Prerequisites

- Docker 24+ and Docker Compose v2+
- 8GB+ RAM (16GB+ recommended for Ollama)
- 20GB+ free disk space
- NVIDIA GPU (optional, for faster Ollama inference)

## Quick Start

### 1. Clone and Configure

```bash
git clone <repository-url>
cd sophia_ai

# Copy environment template
cp .env.example .env

# Edit .env with your values (especially POSTGRES_PASSWORD, JWT keys)
# Generate JWT keys:
mkdir -p backend/keys
openssl genrsa -out backend/keys/private.pem 2048
openssl rsa -in backend/keys/private.pem -pubout -out backend/keys/public.pem
```

### 2. Start All Services

```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Pull Ollama Model

```bash
# Pull the default model (llama3.2) - first run only
docker-compose exec ollama ollama pull llama3.2

# Or pull a different model
docker-compose exec ollama ollama pull mistral
docker-compose exec ollama ollama pull codellama
```

### 4. Verify Deployment

```bash
# Check all services healthy
docker-compose ps

# Test backend health
curl http://localhost:8000/health
# {"status": "ok"}

# Test frontend
open http://localhost:5174
```

## Service Endpoints

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5174 | Main UI |
| Backend API | http://localhost:8000 | REST API |
| API Docs | http://localhost:8000/docs | FastAPI Swagger UI |
| ChromaDB | http://localhost:8001 | Vector DB admin |
| Ollama | http://localhost:11434 | LLM server |
| PostgreSQL | localhost:5432 | Database |

## Service Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│  Backend    │────▶│  PostgreSQL │
│  (Nginx)    │     │  (FastAPI)  │     │  (Users)    │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌───────────┐ ┌───────────┐
              │ ChromaDB  │ │  Ollama   │
              │ (Vectors) │ │   (LLM)   │
              └───────────┘ └───────────┘
```

## Environment Variables

Key variables in `.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_PASSWORD` | Yes | Database password |
| `JWT_PRIVATE_KEY_PATH` | Yes | Path to RSA private key |
| `JWT_PUBLIC_KEY_PATH` | Yes | Path to RSA public key |
| `OLLAMA_MODEL` | No | LLM model (default: llama3.2) |
| `OLLAMA_BASE_URL` | In Docker | `http://ollama:11434` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |

## Generating JWT Keys

```bash
mkdir -p backend/keys
openssl genrsa -out backend/keys/private.pem 2048
openssl rsa -in backend/keys/private.pem -pubout -out backend/keys/public.pem
chmod 600 backend/keys/private.pem
```

## Development vs Production

### Development Mode
```bash
# Frontend with hot reload
cd frontend && npm run dev

# Backend with auto-reload
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production
```bash
docker-compose -f docker-compose.yml up -d --build
```

## Scaling Considerations

### Horizontal Scaling
- **Backend**: Stateless, can run multiple replicas behind load balancer
- **ChromaDB**: Single writer, read replicas supported
- **Ollama**: Single model per GPU, use multiple instances for different models
- **PostgreSQL**: Read replicas for read-heavy workloads

### Resource Requirements

| Service | CPU | RAM | Disk |
|---------|-----|-----|------|
| Frontend | 0.5 | 256MB | 500MB |
| Backend | 1 | 1GB | 2GB |
| PostgreSQL | 1 | 1GB | 10GB |
| ChromaDB | 1 | 2GB | 10GB |
| Ollama (llama3.2) | 2 | 8GB | 10GB |

### GPU Acceleration (Optional)

For faster LLM inference, enable GPU in docker-compose:

```yaml
ollama:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

Requires NVIDIA Container Toolkit installed on host.

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: jose` | Install `pip install python-jose[cryptography]` |
| `ImportError: argon2` | Install `pip install argon2-cffi` |
| Ollama connection refused | Check `OLLAMA_BASE_URL` and Ollama container health |
| ChromaDB connection failed | Verify ChromaDB container is healthy |
| Database connection failed | Check PostgreSQL is ready and credentials |
| PDF upload fails | Check file size < 20MB, valid PDF |
| JWT key errors | Regenerate keys with correct permissions |

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f ollama
docker-compose logs -f chromadb
```

### Restarting Services

```bash
# Restart single service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build backend

# Full restart
docker-compose down && docker-compose up -d
```

## Backup & Restore

### Backup PostgreSQL
```bash
docker-compose exec postgres pg_dump -U postgres sophia_ai > backup.sql
```

### Restore PostgreSQL
```bash
cat backup.sql | docker-compose exec -T postgres psql -U postgres sophia_ai
```

### Backup ChromaDB
```bash
docker cp sophia_chromadb:/chroma/chroma ./chroma_backup
```

### Backup Uploaded Files
```bash
docker cp sophia_backend:/app/data/documents ./documents_backup
```

## Security Checklist

- [ ] Change default `POSTGRES_PASSWORD`
- [ ] Generate unique JWT keys (not committed)
- [ ] Use HTTPS in production (reverse proxy with TLS)
- [ ] Restrict CORS origins to production domains
- [ ] Enable PostgreSQL SSL
- [ ] Configure firewall rules
- [ ] Set up log aggregation
- [ ] Configure backup schedule
- [ ] Set up monitoring/alerting

## Support

For issues, check:
1. Service logs: `docker-compose logs -f <service>`
2. API docs: http://localhost:8000/docs
3. Health endpoints: `/health`, `/api/v1/health`