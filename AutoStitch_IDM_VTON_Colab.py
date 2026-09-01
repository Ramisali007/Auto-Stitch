# ==============================================================================
# Auto Stitch — Free Google Colab Virtual Try-On Server (IDM-VTON / CatVTON)
# ==============================================================================
# INSTRUCTIONS FOR RUNNING ON GOOGLE COLAB (100% FREE T4 / A100 GPU):
# 1. Open Google Colab (https://colab.research.google.com).
# 2. Go to: Runtime -> Change runtime type -> Select "T4 GPU" (or A100 if Colab Pro).
# 3. Create a new notebook, copy and paste the code blocks below into cells, and run them.
# 4. Copy the generated public Gradio URL (e.g. https://xxxx.gradio.live) into
#    your Auto Stitch 'backend/.env' file:
#    VTON_SERVICE_URL=https://xxxx.gradio.live
# 5. Restart your Auto Stitch backend. Virtual Try-On will now run on the free GPU!
# ==============================================================================

# ------------------------------------------------------------------------------
# CELL 1: Install Dependencies
# ------------------------------------------------------------------------------
"""
!pip install -q diffusers transformers accelerate gradio torchvision fvcore einops omegaconf
!pip install -q git+https://github.com/huggingface/accelerate.git
!pip install -q pyngrok python-multipart fastapi uvicorn
"""

# ------------------------------------------------------------------------------
# CELL 2: Clone & Setup IDM-VTON
# ------------------------------------------------------------------------------
"""
import os
if not os.path.exists('IDM-VTON'):
    !git clone https://github.com/yisol/IDM-VTON.git
%cd IDM-VTON
!pip install -r requirements.txt
"""

# ------------------------------------------------------------------------------
# CELL 3: Launch Gradio / FastAPI Server (Public URL)
# ------------------------------------------------------------------------------
"""
import gradio as gr
from gradio_client import Client
import torch

print("🚀 Starting Auto Stitch IDM-VTON GPU Server...")
print(f"CUDA Available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"Device Name: {torch.cuda.get_device_name(0)}")

# Run the official IDM-VTON app with public sharing enabled
# This outputs a public https://xxxx.gradio.live link for Auto Stitch!
!python app.py --share
"""
