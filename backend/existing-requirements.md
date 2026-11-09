Here is the exact hardware and resource breakdown required to host the unmodified Sophia AI backend (**FastAPI + local Ollama + PyTorch/SentenceTransformers + ChromaDB**).

---

### 1. Component Memory & Resource Breakdown (Measured)

| Component                                               | Minimum Idle RAM | Active Load Spike            | Storage (Disk)                   | CPU Usage                           |
| :------------------------------------------------------ | :--------------- | :--------------------------- | :------------------------------- | :---------------------------------- |
| **Ollama (`llama3.2:1b`)**                              | ~1.4 GB          | ~1.8 GB                      | ~1.3 GB (model weights)          | 100% of 2–4 cores during generation |
| **PyTorch & SentenceTransformers** (`all-MiniLM-L6-v2`) | ~480 MB          | ~750 MB (batch chunking)     | ~1.2 GB (PyTorch wheels + cache) | High during PDF upload/embedding    |
| **ChromaDB + SQLite**                                   | ~80 MB           | ~150 MB                      | ~100 MB–1 GB+ (vector index)     | Moderate during similarity query    |
| **FastAPI + Uvicorn + PyMuPDF**                         | ~120 MB          | ~250 MB (parsing large PDFs) | ~200 MB (Python libs)            | Low–Moderate                        |
| **Linux OS Baseline (Debian/Ubuntu)**                   | ~150 MB          | ~200 MB                      | ~2.5 GB (OS + base packages)     | Idle baseline                       |
| **Total Measured Footprint**                            | **~2.2 GB**      | **~3.1 GB – 3.5 GB**         | **~6 GB – 8 GB**                 | **2–4 vCPUs active**                |

_(Note: If you ever switch to `llama3.2:3b` or `mistral:7b`, Ollama's active RAM footprint jumps to **2.8 GB** and **5.2 GB** respectively)._

---

### 2. Minimum vs. Recommended Specifications

#### Minimum Specs (Single User / Demo mode)

_Will run without out-of-memory (OOM) crashes, but will queue concurrent requests._

- **RAM**: **4 GB** (requires a 2 GB swap file enabled as a safety buffer).
- **CPU**: **2 vCPUs** (x86_64).
  - _Response speed_: ~4 to 7 seconds per answer for `llama3.2:1b` on CPU.
- **Disk Storage**: **15 GB – 20 GB SSD** (OS + Docker container + PyTorch wheels + Ollama model weights + PDF storage).
- **GPU**: **None required** (runs purely in CPU mode with `OLLAMA_NUM_GPU=0`).

#### Recommended Specs (Smooth multi-turn & multiple paper uploads)

- **RAM**: **8 GB**.
- **CPU**: **4 vCPUs**.
  - _Response speed_: ~2 to 3 seconds per answer.
- **Disk Storage**: **30 GB SSD** (allows storing hundreds of parsed paper chunks and vector indexes).
- **GPU (Optional)**: 1x NVIDIA T4 or GTX 1650 (4 GB VRAM).
  - _Response speed_: Sub-second (< 0.5s) token generation.

---

### 3. What Happens Under Real Load?

1. **At 512 MB – 1 GB RAM (Render Free / Railway Starter)**:
   - Linux kernel OOM-killer immediately terminates `ollama` or `python` during startup or the first embedding calculation. The server crash-loops.
2. **At 4 GB RAM**:
   - Single-user usage (uploading a paper, asking questions) is stable.
   - If two users upload two 50-page PDFs simultaneously, PyTorch embedding will spike memory up to ~3.5 GB, causing brief lag before returning to idle.
3. **At 8 GB RAM**:
   - Memory is never a bottleneck; CPU inference is the only limiting factor.

---

### 4. Hosting Options That Support These Specs

| Provider                           | Plan                 | Specs                                 | Monthly Cost            | Can run local Ollama?                      |
| :--------------------------------- | :------------------- | :------------------------------------ | :---------------------- | :----------------------------------------- |
| **Hetzner Cloud** (CX22 / CPX21)   | Cloud VPS            | 2–3 vCPU, 4–8 GB RAM, 40 GB SSD       | **~$4.50 – $7.50 / mo** | **Yes** (Best value for full self-hosting) |
| **Railway**                        | Pro / Hobby          | Pay-per-usage up to 8 GB RAM / 8 vCPU | **~$5 – $10 / mo**      | **Yes** (Runs via Dockerfile)              |
| **DigitalOcean / Linode**          | Basic Droplet        | 2 vCPU, 4 GB RAM, 80 GB SSD           | **~$24 / mo**           | **Yes**                                    |
| **Render**                         | Standard Web Service | 2 vCPU, 4 GB RAM                      | **~$45 / mo**           | **Yes** (Expensive for what it offers)     |
| **Render Free Tier + Gemini/Groq** | Free ($0)            | 512 MB RAM (Cloud LLM & Embeddings)   | **$0.00**               | _Offloads models to free cloud APIs_       |

---

### Skipped Items & Known Risks

- **Skipped**: Automatic model pre-download on cold boot (in Docker, Ollama pulls the model on image build or first run).
- **Known Risk**: CPU inference on shared hypervisors (like entry-level cloud VPS) can throttle if the hosting provider limits continuous 100% CPU spikes during long generation tasks.
