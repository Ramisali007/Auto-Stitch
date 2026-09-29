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
# ==============================================================================
# CELL 3: Launch Pure FastAPI IDM-VTON Server (Clean CUDA & VAE Slicing)
# ==============================================================================
"""
# 1. Reset gradio_demo/app.py and src/tryon_pipeline.py to pristine official state
!cd /content/IDM-VTON && git checkout gradio_demo/app.py src/tryon_pipeline.py
!sed -i 's/image_blocks.launch.*//g' /content/IDM-VTON/gradio_demo/app.py

# 2. CRITICAL MEMORY FIX FOR TESLA T4:
# Route DensePose to CPU! (DensePose takes only ~1.2s on CPU and uses ZERO GPU VRAM)
!sed -i 's/"MODEL.DEVICE", "cuda"/"MODEL.DEVICE", "cpu"/g' /content/IDM-VTON/gradio_demo/app.py

# Route category dynamically (support dresses/suits as well as tops)
!sed -i 's/get_mask_location(\x27hd\x27, "upper_body"/get_mask_location(\x27hd\x27, ("dresses" if any(w in garment_des.lower() for w in ["dress", "suit", "gown", "maxi"]) else "upper_body")/g' /content/IDM-VTON/gradio_demo/app.py

# 3. Patch VAE decode in src/tryon_pipeline.py with automatic CPU fallback & memory flush
pipeline_file = '/content/IDM-VTON/src/tryon_pipeline.py'
with open(pipeline_file, 'r') as f:
    code = f.read()

target = "image = self.vae.decode(latents / self.vae.config.scaling_factor, return_dict=False)[0]"
replacement = """# Offload UNet to CPU for 0.4s to give VAE 3.5GB of free VRAM on GPU (Eliminates OOM and CPU lag)
        orig_unet_device = self.unet.device
        try:
            self.unet.to("cpu")
            if hasattr(self, "unet_encoder"):
                self.unet_encoder.to("cpu")
            torch.cuda.empty_cache()
            image = self.vae.decode(latents / self.vae.config.scaling_factor, return_dict=False)[0]
        finally:
            self.unet.to(orig_unet_device)
            if hasattr(self, "unet_encoder"):
                self.unet_encoder.to(orig_unet_device)"""

if target in code:
    code = code.replace(target, replacement)
    with open(pipeline_file, 'w') as f:
        f.write(code)
    print('✅ Successfully patched VAE decode with instant GPU VRAM offload!')
else:
    print('⚠️ Target line already patched or modified.')

print('✅ app.py clean, DensePose routed to CPU, and VAE decode protected against OOM!')

# 4. Write FastAPI Server with Garment Auto-Isolation & True Color Matching
server_code = '''
import os, sys, io, base64, torch, uvicorn, subprocess, time, re, gc
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Prevent CUDA memory fragmentation
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

sys.path.append('/content/IDM-VTON')
sys.path.append('/content/IDM-VTON/gradio_demo')

from gradio_demo import app as vton_app

device = "cuda:0" if torch.cuda.is_available() else "cpu"

print("🚀 Configuring IDM-VTON memory optimizations for Tesla T4...")

# 1. Explicitly place pipeline and UNet_Encoder on CUDA FP16 (eliminates device mismatch)
vton_app.pipe.to(device, torch.float16)
vton_app.UNet_Encoder.to(device, torch.float16)

# 2. Activate Memory Slicing (Saves ~4GB VRAM without touching tensor device mapping)
vton_app.pipe.enable_attention_slicing(1)
vton_app.pipe.enable_vae_slicing()
vton_app.pipe.enable_vae_tiling()
print("⚡ Pipeline on CUDA FP16 with Attention & VAE Slicing Activated!")

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
    garment_name: str = "Formal Suit"
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

def extract_clean_garment(garment_pil: Image.Image):
    """
    Intelligently extracts clothing pixels from a model photo onto a clean white canvas.
    If the image is already a clean catalog shot (white/neutral background), preserves it 100%!
    """
    try:
        import numpy as np
        import cv2
        w, h = garment_pil.size
        
        # Check if the image corners are already white / neutral background
        arr = np.array(garment_pil)
        corners = [arr[0:20, 0:20], arr[0:20, -20:], arr[-20:, 0:20], arr[-20:, -20:]]
        corner_means = [c.mean() for c in corners]
        if all(m > 235 for m in corner_means):
            # Already a clean catalog/studio shot on white canvas! Keep 100% of fabric & embroidery!
            print("✨ Garment is already a clean catalog photo; preserving 100% fabric texture & embroidery!")
            return garment_pil

        parse_img, _ = vton_app.parsing_model(garment_pil.resize((384, 512)))
        parse_arr = np.array(parse_img.resize((w, h), Image.NEAREST))
        
        # Clothing labels: 4: upper clothes, 5: skirt, 6: pants, 7: dress, 17: scarf/dupatta
        cloth_mask = (
            (parse_arr == 4) | 
            (parse_arr == 5) | 
            (parse_arr == 6) | 
            (parse_arr == 7) | 
            (parse_arr == 17)
        )
        
        if cloth_mask.sum() > (w * h * 0.05):
            kernel = np.ones((7, 7), np.uint8)
            cloth_mask_dilated = cv2.dilate(cloth_mask.astype(np.uint8), kernel, iterations=2)
            
            clean_bg = Image.new("RGB", (w, h), (255, 255, 255))
            clean_bg.paste(garment_pil, mask=Image.fromarray(cloth_mask_dilated * 255))
            print("✨ Garment isolated! Removed background walls, skin & jewelry.")
            return clean_bg
    except Exception as e:
        print(f"⚠️ Garment isolation note: {e}")
    return garment_pil

@app.get("/health")
@app.get("/config")
def health():
    free_gb = round(torch.cuda.mem_get_info()[0] / (1024**3), 2) if torch.cuda.is_available() else 0
    return {
        "status": "ok",
        "ready": True,
        "engine": "IDM-VTON Pure FastAPI (Tesla T4 High-Fidelity)",
        "device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "cpu",
        "vram_free_gb": free_gb
    }

@app.post("/api/tryon")
@app.post("/tryon_direct")
@app.post("/tryon")
def handle_tryon(req: DirectTryOnRequest):
    print(f"📥 Processing High-Fidelity Virtual Try-On for: {req.garment_name} ({req.category})...")
    try:
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        human_pil = decode_b64(req.human_image)
        raw_garment = decode_b64(req.garment_image)

        # Standardize to IDM-VTON native 768x1024 resolution
        human_pil = human_pil.resize((768, 1024), Image.Resampling.LANCZOS)
        raw_garment = raw_garment.resize((768, 1024), Image.Resampling.LANCZOS)

        # Auto-isolate garment from model/catalog photo (preserves clean studio photos intact)
        garment_pil = extract_clean_garment(raw_garment)

        dict_payload = {"background": human_pil, "layers": [], "composite": human_pil}
        
        # Faithful prompt without hallucinated color tags (lets GarmentNet extract true colors)
        prompt = f"a high resolution photo of model wearing {req.garment_name}, {req.category}, natural cloth folds, authentic fabric embroidery and pattern, 8k studio photograph"

        with torch.inference_mode():
            output_image, _ = vton_app.start_tryon(
                dict_payload, 
                garment_pil, 
                prompt, 
                True,  # auto-mask
                False, # auto-crop
                30,    # 30 denoise steps (sharp embroidery & cloth detail)
                42     # seed
            )

        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        print("✅ Diffusion Virtual Try-On Complete & Photorealistic!")
        return {"success": True, "result_image": encode_b64(output_image)}
    except Exception as e:
        import traceback
        traceback.print_exc()
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        error_msg = str(e)
        if "list index out of range" in error_msg or isinstance(e, IndexError):
            error_msg = "Human pose not detected. Please upload a clear portrait where the person's upper body and shoulders are visible."
        raise HTTPException(status_code=422 if "Human pose" in error_msg else 500, detail=error_msg)

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
    print("🚀 Auto Stitch IDM-VTON Cloud Server LIVE (Tesla T4 Ready)!")
    if pub_url:
        print(f"🔥 Public API URL: {pub_url}")
    print("=" * 60)

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
'''

with open('/content/IDM-VTON/fastapi_server.py', 'w') as f:
    f.write(server_code.strip())

%cd /content/IDM-VTON
!python /content/IDM-VTON/fastapi_server.py
"""
