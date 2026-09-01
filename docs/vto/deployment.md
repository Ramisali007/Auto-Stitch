# Virtual Try-On Deployment & Environment Setup Guide

## 1. Environment Variables (`backend/.env`)

```ini
# Virtual Try-On Subsystem Settings
VTO_ENABLED=true
VTO_MODEL=fashn-vton-1.5
VTO_MODEL_VERSION=1.5.0
VTO_DEVICE=cuda
VTO_DTYPE=fp16
VTO_TIMEOUT_SECONDS=90
VTO_UPLOAD_EXPIRY_SECONDS=900
VTO_RESULT_EXPIRY_SECONDS=3600
VTO_MAX_RETRIES=2
VTO_CONCURRENT_JOBS=2

# AWS S3 (Optional - Automatically falls back to isolated local private storage if omitted)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_VTO_BUCKET=autostitch-vto-private
AWS_S3_VTO_PREFIX=vto/temp/

# Self-Hosted GPU Server (Google Colab / Dedicated FastAPI)
VTON_SERVICE_URL=
```

---

## 2. Standalone GPU Worker Startup

To run the dedicated Python GPU worker on an NVIDIA GPU machine:
```bash
# 1. Install PyTorch & Model Dependencies
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install diffusers transformers accelerate pillow fastapi uvicorn

# 2. Start Worker
python vto_worker.py --port 8000
```
