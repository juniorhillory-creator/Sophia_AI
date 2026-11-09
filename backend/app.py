import os
import uvicorn
from app.main import create_app

# Hugging Face Spaces provides the port via the PORT env var (defaults to 7860)
port = int(os.environ.get("PORT", 7860))

app = create_app()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=port)

