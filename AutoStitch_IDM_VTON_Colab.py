# ==============================================================================
# Auto Stitch — IDM-VTON Photorealistic Virtual Try-On Server
# ==============================================================================
# Run the official IDM-VTON on Google Colab (100% Free T4 GPU)
# ==============================================================================

# ==============================================================================
# CELL 1: Install Dependencies
# ==============================================================================
"""
!pip uninstall -y jax jaxlib
!pip install -q huggingface_hub==0.25.2
!pip install -q diffusers==0.25.1 transformers==4.36.2 accelerate==0.27.2 gradio==4.44.1
!pip install -q einops omegaconf fvcore bitsandbytes torchvision onnxruntime-gpu
!pip install -q av opencv-python scipy lpips peft==0.7.1
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
print('✅ All Checkpoints Ready!')
"""

# ==============================================================================
# CELL 3: Build & Launch Clean Dedicated AI Server
# ==============================================================================
"""
server_code = '''
import os, sys, io, base64, torch
from PIL import Image
from pydantic import BaseModel

sys.path.append('/content/IDM-VTON')
sys.path.append('/content/IDM-VTON/gradio_demo')

# Load IDM-VTON pipeline components
from gradio_demo.app import image_blocks, start_tryon

class DirectTryOnRequest(BaseModel):
    human_image: str
    garment_image: str
    category: str = 'dresses'
    fit_style: str = 'Tailored'

def decode_b64(b64_str: str) -> Image.Image:
    if ',' in b64_str:
        b64_str = b64_str.split(',')[1]
    data = base64.b64decode(b64_str)
    return Image.open(io.BytesIO(data)).convert('RGB')

def encode_b64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=95)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode('utf-8')

# Attach direct REST endpoint
@image_blocks.app.post('/api/tryon')
async def handle_direct_tryon(req: DirectTryOnRequest):
    print(f'📥 Processing Try-On for Category: {req.category} on GPU...')
    try:
        human_pil = decode_b64(req.human_image)
        garment_pil = decode_b64(req.garment_image)
        dict_payload = {'background': human_pil, 'layers': [], 'composite': human_pil}
        prompt = f'elegant high fashion model wearing luxury {req.category}, natural cloth folds, studio lighting'
        output_image, _ = start_tryon(dict_payload, garment_pil, prompt, True, False, 30, 42)
        print('✅ Try-On Completed Successfully on GPU!')
        return {'success': True, 'result_image': encode_b64(output_image)}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}

print('=' * 60)
print('🚀 Auto Stitch IDM-VTON Cloud Engine Ready!')
print(f'CUDA Device: {torch.cuda.get_device_name(0)}')
print('=' * 60)

image_blocks.launch(share=True)
'''

with open('/content/IDM-VTON/server_app.py', 'w') as f:
    f.write(server_code.strip())

%cd /content/IDM-VTON
!python /content/IDM-VTON/server_app.py
"""
