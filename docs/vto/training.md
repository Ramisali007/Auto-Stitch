# Virtual Try-On Model Fine-Tuning & Future Dataset Strategy

## 1. Zero Initial Training Rationale

Pretrained open-weight models (e.g. FASHN VTON v1.5) combined with high-precision neural cloth transfer compositing achieve high baseline fidelity on Pakistani ethnic and luxury pret garments (kurtis, anarkalis, lehengas, shalwar kameez) without requiring multimillion-parameter training from scratch.

---

## 2. When to Consider Fine-Tuning

Fine-tuning is only justified if:
1. Benchmark testing on boutique catalog garments exhibits systematic failure on intricate zari / gota embroidery or semi-sheer organza/chiffon drapes.
2. An ethically and legally verified dataset of $\ge 2,000$ paired commercial images is available with signed model releases.

---

## 3. Dataset Guidelines & Subject-Level Split

If fine-tuning is initiated in future phases:
- **Subject-Level Split**: Subjects appearing in the training set must NEVER appear in validation or test splits to prevent artificial metric inflation.
- **Commercial Model Releases**: Every human portrait in the training corpus must have documented commercial consent for generative AI model training.
- **Experiment Tracking**: Use MLflow / Weights & Biases to log SSIM, LPIPS, FID, and human perceptual scores per checkpoint.
