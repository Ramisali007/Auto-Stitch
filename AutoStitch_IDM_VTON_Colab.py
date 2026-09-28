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
# CELL 2: Clone IDM-VTON, Download Checkpoints & Enable Public Sharing
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

# Enable share=True in gradio_demo/app.py to generate live public tunnel
!sed -i 's/image_blocks.launch()/image_blocks.launch(share=True)/g' /content/IDM-VTON/gradio_demo/app.py
print('✅ All Checkpoints Ready & Public Tunnel Enabled!')
"""

# ==============================================================================
# CELL 3: Launch IDM-VTON Server
# ==============================================================================
"""
import torch
print('=' * 60)
print('🚀 Auto Stitch IDM-VTON Cloud Server Launching...')
print(f'CUDA Available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'GPU Device: {torch.cuda.get_device_name(0)}')
print('=' * 60)

# Run the app
!python gradio_demo/app.py
"""
