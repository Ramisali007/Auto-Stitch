"""
Auto-Stitch 100% Free Google Colab FastAPI Server (Zero Cost, No Credits, No 404s)
Runs PyTorch Diffusion on a Free Google Colab T4 GPU with a direct REST API.
"""

# ==============================================================================
# CELL 1: INSTALL DEPENDENCIES (Run in Colab)
# ==============================================================================
# !pip install -q fastapi uvicorn pyngrok diffusers transformers accelerate torchvision pillow python-multipart

import io
import base64
import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image, ImageDraw, ImageFilter
from diffusers import StableDiffusionInpaintPipeline

app = FastAPI(title="Auto-Stitch Diffusion VTO Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = "cuda" if torch.cuda.is_available() else "cpu"
dtype = torch.float16 if torch.cuda.is_available() else torch.float32

print(f"🚀 Initializing Diffusion Inpainting Pipeline on {device}...")

pipe = StableDiffusionInpaintPipeline.from_pretrained(
    "runwayml/stable-diffusion-inpainting",
    torch_dtype=dtype,
    low_cpu_mem_usage=True,
    safety_checker=None
).to(device)

if device == "cuda":
    pipe.enable_attention_slicing()

print("✅ Model Loaded Successfully into GPU Memory!")

def decode_base64_img(base64_str: str) -> Image.Image:
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    img_data = base64.b64decode(base64_str)
    return Image.open(io.BytesIO(img_data)).convert("RGB")

def encode_img_base64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

class TryOnRequest(BaseModel):
    human_image: str
    garment_image: str
    category: str = "dresses"
    fit_style: str = "Tailored"

@app.get("/health")
def health():
    return {"ready": True, "device": device, "service": "Auto-Stitch-FastAPI-VTO"}

@app.post("/api/tryon")
async def generate_tryon(req: TryOnRequest):
    try:
        human_img = decode_base64_img(req.human_image).resize((512, 768), Image.LANCZOS)
        garment_img = decode_base64_img(req.garment_image).resize((512, 768), Image.LANCZOS)

        # 1. Generate anatomical clothing mask (leaves face, neck, and hair untouched)
        w, h = human_img.size
        mask = Image.new("L", (w, h), 0)
        draw = ImageDraw.Draw(mask)

        # Drape contour for torso & garments
        draw.polygon([
            (int(w * 0.15), int(h * 0.23)),
            (int(w * 0.85), int(h * 0.23)),
            (int(w * 0.95), int(h * 0.98)),
            (int(w * 0.05), int(h * 0.98)),
        ], fill=255)

        mask = mask.filter(ImageFilter.GaussianBlur(radius=8))

        # 2. Diffusion Neural Inpainting
        prompt = f"photorealistic elegant model wearing luxury {req.category}, natural cloth folds, studio lighting, highly detailed fabric"
        negative_prompt = "deformed, bad anatomy, blurry, duplicate head, artifacts"

        with torch.inference_mode():
            result = pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                image=human_img,
                mask_image=mask,
                num_inference_steps=20,
                guidance_scale=7.5,
            ).images[0]

        result_b64 = encode_img_base64(result)
        return {"success": True, "result_image": result_b64}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==============================================================================
# CELL 2: EXPOSE VIA NGROK OR LOCAL TUNNEL
# ==============================================================================
# from pyngrok import ngrok
# ngrok.set_auth_token("YOUR_FREE_NGROK_TOKEN") # https://dashboard.ngrok.com/get-started/your-authtoken
# public_url = ngrok.connect(8000).public_url
# print("🔥 Public VTO API URL:", public_url)
# uvicorn.run(app, host="0.0.0.0", port=8000)
