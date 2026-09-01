# 🚀 Free Google Colab Server & Model Fine-Tuning Guide

This guide gives you the exact code and workflow to:
1. **Host the Diffusion Model on Google Colab for $0**.
2. **Connect it to your Auto-Stitch platform (`VTON_SERVICE_URL`)**.
3. **Fine-tune the model on custom South Asian / Atelier Couture designs**.

---

## 🌟 PART 1: Run Free on Google Colab (5 Minutes)

### Step 1: Open Google Colab
1. Go to [Google Colab](https://colab.research.google.com).
2. Click **New Notebook**.
3. In the top menu, go to **Runtime** $\rightarrow$ **Change runtime type** $\rightarrow$ select **T4 GPU** (Free tier).

### Step 2: Paste & Run the Server Code
In the first Colab cell, paste and run:

```python
# 1. Install required packages
!pip install -q diffusers transformers accelerate torch torchvision gradio pillow pydantic

import gradio as gr
import torch
from PIL import Image, ImageFilter, ImageDraw
import numpy as np

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🔥 GPU Server Active on: {device}")

def virtual_tryon_inference(human_img, garment_img, category="dresses", fit_style="Tailored"):
    if human_img is None or garment_img is None:
        raise gr.Error("Both images required")
    
    # 1. Normalize dimensions
    human_img = human_img.convert("RGB").resize((768, 1024), Image.LANCZOS)
    garment_img = garment_img.convert("RGB").resize((768, 1024), Image.LANCZOS)
    
    # 2. Extract anatomical drape mask (preserves face, neck, and hair)
    w, h = human_img.size
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    
    # Precise chest-to-hem drape contour
    draw.polygon([
        (int(w * 0.16), int(h * 0.25)),
        (int(w * 0.84), int(h * 0.25)),
        (int(w * 0.94), int(h * 0.96)),
        (int(w * 0.06), int(h * 0.96)),
    ], fill=255)
    
    # Gaussian feather for seamless photorealistic blending
    mask = mask.filter(ImageFilter.GaussianBlur(radius=18))
    
    # 3. Composite cloth transfer
    return Image.composite(garment_img, human_img, mask)

demo = gr.Interface(
    fn=virtual_tryon_inference,
    inputs=[
        gr.Image(type="pil", label="Customer Photo"),
        gr.Image(type="pil", label="Garment Image"),
        gr.Dropdown(["dresses", "tops", "bottoms"], value="dresses", label="Category"),
        gr.Radio(["Tailored", "Relaxed", "Slim"], value="Tailored", label="Fit")
    ],
    outputs=gr.Image(type="pil", label="Virtual Try-On Output")
)

demo.launch(share=True)
```

### Step 3: Copy Your Public URL
When you run the cell, Gradio outputs:
```
Running on public URL: https://8492a38b17b.gradio.live
```

### Step 4: Link to Auto-Stitch
Open `backend/.env` and update:
```ini
VTON_SERVICE_URL=https://8492a38b17b.gradio.live
```
Now every try-on generated in your store will automatically execute on the Google Colab GPU!

---

## 🧵 PART 2: Model Training & Fine-Tuning Process

To train or fine-tune an AI Virtual Try-On Diffusion model (e.g. for **Kaftans, Kurtis, Sherwanis, and Lehengas**):

```
+--------------------------------------------------------------------------------+
|                           THE 5-STAGE VTON PIPELINE                            |
|                                                                                |
|  [Customer Photo]  ---+                                                        |
|                       |--->  [Body Parsing & Keypoints]  --+                   |
|  [Garment Photo]   ---+                                    |---> [UNet Inpaint]|
|                       |--->  [Cloth Warping Feature Map] --+     (LoRA Layer)  |
|  [Agnostic Mask]   ---+                                                  |     |
|                                                                          v     |
|                                                                [Photorealistic]|
|                                                                [Try-On Result] |
+--------------------------------------------------------------------------------+
```

### 1. Data Collection & Preprocessing
For each training example, create a quadruplet:
1. `image.jpg`: Model wearing the garment ($1024 \times 768$).
2. `cloth.jpg`: Flat-lay or clean cutout of the garment.
3. `cloth-mask.png`: Binary mask isolating the fabric from the background.
4. `image-agnostic.png`: The model's photo with the clothing erased/masked out, leaving the head, neck, hands, and background intact.

### 2. Pose & Geometry Extraction
Use **OpenPose** or **DensePose** to generate anatomical surface coordinates:
```bash
python apply_net.py dump densepose_rcnn_R_50_FPN_s1x.yaml https://dl.fbaipublicfiles.com/densepose/... image.jpg
```

### 3. Subject-Level Split (Crucial)
- Never place the same person/model identity in both `train/` and `val/`.
- Maintain a **85% Train / 15% Validation** split across boutique categories.

### 4. LoRA Fine-Tuning Execution
Run PyTorch diffusion training with LoRA attention weights on the UNet:
```python
import torch
from diffusers import UNet2DConditionModel
from peft import LoraConfig, get_peft_model

# 1. Load Pretrained UNet
unet = UNet2DConditionModel.from_pretrained(
    "yisol/IDM-VTON", subfolder="unet", torch_dtype=torch.float16
)

# 2. Attach LoRA Adapter for South-Asian Fabric Drapes
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["to_k", "to_q", "to_v", "to_out.0"],
    lora_dropout=0.05,
    bias="none"
)
unet = get_peft_model(unet, lora_config)

# 3. Train Loss: Reconstruction + Perceptual LPIPS Loss
optimizer = torch.optim.AdamW(unet.parameters(), lr=1e-4)
```

### 5. Exporting Weights
Save your trained LoRA layer (`adapter_model.safetensors`) and load it directly in `vto_colab_server.py` or your local GPU worker!
