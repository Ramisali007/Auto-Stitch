# Virtual Try-On Model Licensing & Legal Audit

> **Verification Date**: September 1, 2026  
> **Document Purpose**: Exhaustive legal and commercial verification for self-hosted VTO models, checkpoints, dependencies, and datasets.

---

## 1. Candidate Models Legal Matrix

| Model Name | Version | Repository Source | Code License | Checkpoint / Weights License | Commercial Use Allowed? | Key Restrictions & Attribution | Final Production Decision |
| :--- | :---: | :--- | :---: | :---: | :---: | :--- | :--- |
| **FASHN VTON** | v1.5 | [fashn-ai/fashn-vton-1.5](https://github.com/fashn-ai) | Apache 2.0 | Apache 2.0 / Open Weights | **YES** | Attribution required under Apache 2.0 terms; no trademark grant. | **PRIMARY CANDIDATE** for self-hosted local GPU inference. |
| **IDM-VTON** | v1.0 | [yisol/IDM-VTON](https://github.com/yisol/IDM-VTON) | CC BY-NC-SA 4.0 | CC BY-NC-SA 4.0 | **NO (Non-Commercial Only)** | Strictly Non-Commercial. Commercial production deployment is restricted without commercial licensing waiver. | **RESTRICTED** to research/testing or gated behind explicit vendor API. |
| **CatVTON** | v1.0 | [Zheng-Chong/CatVTON](https://github.com/Zheng-Chong/CatVTON) | CC BY-NC-SA 4.0 | CC BY-NC-SA 4.0 | **NO (Non-Commercial Only)** | Non-commercial research license. Share-Alike derivative obligations. | **RESTRICTED** for commercial production. |
| **OOTDiffusion** | v1.0 | [levihsu/OOTDiffusion](https://github.com/levihsu/OOTDiffusion) | Apache 2.0 (Code) / CC BY-NC-SA (Checkpoints) | CC BY-NC-SA 4.0 (Checkpoints derived from VITON-HD) | **NO (Due to Weights)** | Base checkpoints inherit non-commercial terms from VITON-HD dataset. | **RESTRICTED** for commercial production. |
| **Local Neural Cloth Transfer (Sharp / SVG)** | v2.0 | Auto Stitch Internal Engine | MIT / Proprietary | N/A (Algorithmic / CV Compositor) | **YES** | 100% commercially compliant, zero external licensing obligations. | **PRIMARY DEFAULT / RESILIENT FALLBACK**. |

---

## 2. Dataset Legal Review & Training Restrictions

| Dataset Name | Source | License / Terms | Commercial Training Usability | Notes & Governance |
| :--- | :--- | :--- | :---: | :--- |
| **VITON-HD** | Academic Research | Non-Commercial Research Only | **PROHIBITED** | Strict non-commercial restriction. Cannot be used to fine-tune production models. |
| **Dress Code** | Academic / Corporate Research | Academic / Non-Commercial for Private Companies | **PROHIBITED without Custom License** | Specific restrictions regarding private enterprise usage. |
| **Boutique-Owned Catalog Pairs** | Auto Stitch Partner Boutiques | Commercial Partner Agreement | **PERMITTED** | Images provided with explicit commercial rights from verified boutique owners. |
| **Synthetic / In-House Studio Pairs** | Auto Stitch Studio Shoots | Full Proprietary Copyright | **PERMITTED** | Model photography with signed commercial model releases. |

---

## 3. Customer Photo Policy

> [!CAUTION]
> **Strict Zero-Training Mandate**:
> - Customer-uploaded photographs are used **strictly for transient inference**.
> - Customer images are **NEVER** written to training directories (`/training`, `/datasets`, `/model-improvement`).
> - Customer images are automatically deleted from server memory and private storage upon completion of inference or user cancellation.
> - Any future fine-tuning or model training must strictly use legally licensed studio imagery with signed commercial releases.
