# ==============================================================================
# Auto Stitch — IDM-VTON Photorealistic Virtual Try-On Server
# ==============================================================================
# Run the official IDM-VTON on Google Colab (100% Free T4 GPU)
# ==============================================================================

# ==============================================================================
# CELL 1: Install Dependencies & Cloudflare Tunnel
# ==============================================================================
"""
!pip uninstall -y jax jaxlib
!pip install -q huggingface_hub==0.25.2
!pip install -q diffusers==0.25.1 transformers==4.36.2 accelerate==0.27.2 gradio==4.44.1 uvicorn fastapi
!pip install -q einops omegaconf fvcore bitsandbytes torchvision onnxruntime-gpu
!pip install -q av opencv-python scipy lpips peft==0.7.1

# Download Cloudflare tunnel binary (100% Free, zero-signup instant public HTTPS)
!wget -q -nc https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared
!chmod +x /usr/local/bin/cloudflared
"""

# ==============================================================================
# CELL 2: Clone IDM-VTON & Download Required AI Checkpoints
# ==============================================================================
"""
import os
if not os.path.exists('/content/IDM-VTON'):
    !git clone https://github.com/yisol/IDM-VTON.git /content/IDM-VTON
%cd /content/IDM-VTON

# Create checkpoint directories
!mkdir -p ckpt/densepose ckpt/humanparsing ckpt/openpose/ckpts

print('📥 Downloading DensePose & Human Parsing models...')
!wget -q -O ckpt/densepose/model_final_162be9.pkl https://huggingface.co/spaces/yisol/IDM-VTON/resolve/main/ckpt/densepose/model_final_162be9.pkl
!wget -q -O ckpt/humanparsing/parsing_atr.onnx https://huggingface.co/spaces/yisol/IDM-VTON/resolve/main/ckpt/humanparsing/parsing_atr.onnx
!wget -q -O ckpt/humanparsing/parsing_lip.onnx https://huggingface.co/spaces/yisol/IDM-VTON/resolve/main/ckpt/humanparsing/parsing_lip.onnx
!wget -q -O ckpt/openpose/ckpts/body_pose_model.pth https://huggingface.co/spaces/yisol/IDM-VTON/resolve/main/ckpt/openpose/ckpts/body_pose_model.pth

# Clean app.py to prevent auto-launch on import
!sed -i 's/image_blocks.launch.*//g' /content/IDM-VTON/gradio_demo/app.py
print('✅ All Checkpoints Ready!')
"""

# ==============================================================================
# CELL 3: Launch Pure FastAPI IDM-VTON Server with Instant Public HTTPS Tunnel
# ==============================================================================
"""
server_code = '''
import os, sys, io, base64, torch, uvicorn, subprocess, time, re, gc
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.append('/content/IDM-VTON')
sys.path.append('/content/IDM-VTON/gradio_demo')

# Import gradio_demo.app modules
from gradio_demo import app as vton_app

# Enable memory optimizations for Tesla T4 GPU (Prevents CUDA OOM)
if hasattr(vton_app, "pipe") and vton_app.pipe is not None:
    try:
        vton_app.pipe.enable_vae_slicing()
        vton_app.pipe.enable_vae_tiling()
        print("⚡ VAE Slicing & Tiling Enabled!")
    except Exception as e:
        print("VAE optimization notice:", e)

app = FastAPI(title="Auto-Stitch IDM-VTON Engine")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DirectTryOnRequest(BaseModel):
    human_image: str
    garment_image: str
    category: str = "dresses"
    fit_style: str = "Tailored"

def decode_b64(b64_str: str) -> Image.Image:
    if "," in b64_str:
        b64_str = b64_str.split(",")[1]
    data = base64.b64decode(b64_str)
    return Image.open(io.BytesIO(data)).convert("RGB")

def encode_b64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

@app.get("/health")
@app.get("/config")
def health():
    return {
        "status": "ok",
        "ready": True,
        "engine": "IDM-VTON Pure FastAPI (Optimized)",
        "device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "cpu",
        "vram_free_gb": round(torch.cuda.mem_get_info()[0] / (1024**3), 2) if torch.cuda.is_available() else 0
    }

@app.post("/api/tryon")
@app.post("/tryon_direct")
@app.post("/tryon")
def handle_tryon(req: DirectTryOnRequest):
    print(f"📥 Processing High-Fidelity Try-On for Category: {req.category} on Tesla T4 GPU...")
    try:
        # 1. Clean CUDA Cache before run
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        human_pil = decode_b64(req.human_image)
        garment_pil = decode_b64(req.garment_image)

        # Ensure optimal dimensions (max 768x1024 for standard IDM-VTON diffusion ratio)
        if human_pil.width > 1024 or human_pil.height > 1024:
            human_pil.thumbnail((768, 1024), Image.Resampling.LANCZOS)
        if garment_pil.width > 1024 or garment_pil.height > 1024:
            garment_pil.thumbnail((768, 1024), Image.Resampling.LANCZOS)

        dict_payload = {"background": human_pil, "layers": [], "composite": human_pil}
        prompt = f"model wearing elegant luxury {req.category}, natural cloth texture, high quality studio photo"

        # 2. Run Try-On with inference mode and 25 denoising steps (prevents OOM, preserves photorealism)
        with torch.inference_mode():
            output_image, _ = vton_app.start_tryon(
                dict_payload, 
                garment_pil, 
                prompt, 
                True,  # auto-mask
                False, # auto-crop
                25,    # denoise steps
                42     # seed
            )

        # 3. Offload & clear cache immediately
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        print("✅ IDM-VTON High-Fidelity Result Generated Successfully!")
        return {"success": True, "result_image": encode_b64(output_image)}
    except Exception as e:
        import traceback
        traceback.print_exc()
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        raise HTTPException(status_code=500, detail=str(e))

def start_tunnel():
    try:
        cf = subprocess.Popen(["/usr/local/bin/cloudflared", "tunnel", "--url", "http://127.0.0.1:8000"], stderr=subprocess.PIPE, stdout=subprocess.DEVNULL, text=True)
        for _ in range(25):
            line = cf.stderr.readline()
            match = re.search(r'https://[a-zA-Z0-9-]+\\.trycloudflare\\.com', line)
            if match:
                return match.group(0)
            time.sleep(0.2)
    except Exception:
        pass
    try:
        from gradio.networking import setup_tunnel
        return setup_tunnel("127.0.0.1", 8000, "", None)
    except Exception:
        return None

if __name__ == "__main__":
    pub_url = start_tunnel()
    print("=" * 60)
    print("🚀 Auto Stitch IDM-VTON Cloud Server LIVE (VRAM Optimized)!")
    if pub_url:
        print(f"🔥 Public API URL: {pub_url}")
    print("=" * 60)

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
'''

# Clean app.py launch calls and enable VAE slicing in app.py directly
!sed -i 's/image_blocks.launch.*//g' /content/IDM-VTON/gradio_demo/app.py

with open('/content/IDM-VTON/fastapi_server.py', 'w') as f:
    f.write(server_code.strip())

%cd /content/IDM-VTON
!python /content/IDM-VTON/fastapi_server.py
"""
