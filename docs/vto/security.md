# Virtual Try-On Security Architecture & Threat Model

## 1. Threat Model & Mitigations

| Threat Vector | Potential Impact | Architecture Mitigation |
| :--- | :--- | :--- |
| **Insecure Direct Object Reference (IDOR)** | User A viewing User B's try-on photo | Strict ownership validation in API: `job.user._id === req.user._id` (or matching encrypted guest session token). |
| **Malicious File / Polyglot Upload** | Remote Code Execution via image exploits | Magic-byte file signature validation + Sharp image decode/re-encode in sandbox memory before passing to inference. |
| **Resource Exhaustion / Denial of Service** | GPU VRAM OOM / Queue flood | Per-user rate limiting, max concurrent job caps, file size limits (max 8MB), and request timeouts (90s). |
| **Cross-Boutique Garment Spoofing** | Forcing try-on with unauthorized product images | Trusted `productId` validation: Backend resolves the garment image exclusively from database record. |
| **Credential Leakage** | Exposure of AWS S3 credentials | Frontend receives zero IAM keys; uses backend pre-signed PUT/GET URLs with short 15-minute TTL. |

---

## 2. Validation Pipeline

1. **Size check**: Reject payloads > 8 MB.
2. **Magic bytes check**: Confirm `FF D8 FF` (JPEG), `89 50 4E 47` (PNG), or `52 49 46 46 ... 57 45 42 50` (WebP).
3. **Sharp sanitization**: Load into Sharp buffer, discard auxiliary EXIF/XMP metadata chunks, and normalize orientation.
4. **Dimensions check**: Verify resolution $\ge 400 \times 400$ and $\le 4000 \times 4000$.
