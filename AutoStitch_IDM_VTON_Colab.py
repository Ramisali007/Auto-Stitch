# ==============================================================================
# Auto Stitch — IDM-VTON Photorealistic Virtual Try-On Server
# ==============================================================================
# Run the official IDM-VTON on Google Colab (100% Free T4 GPU)
# ==============================================================================

# ==============================================================================
# CELL 1: Install Dependencies (Compatible Versions)
# ==============================================================================
"""
!pip install -q diffusers==0.25.1 transformers==4.36.2 accelerate==0.25.0 gradio==4.26.0
!pip install -q einops omegaconf fvcore bitsandbytes torchvision onnxruntime-gpu
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
# CELL 3: Launch IDM-VTON Server with Public Tunnel
# ==============================================================================
"""
import torch
print('=' * 60)
print('🚀 Auto Stitch IDM-VTON Cloud Server Launching...')
print(f'CUDA Available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'GPU Device: {torch.cuda.get_device_name(0)}')
print('=' * 60)

# Run gradio_demo/app.py with public sharing
!python gradio_demo/app.py --share
"""
