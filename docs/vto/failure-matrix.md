# Virtual Try-On Edge-Case Failure Matrix & Resolutions

| Scenario | Raw Result Without Mitigation | Handled? | Root Cause | Engineering Fix / Mitigation |
| :--- | :--- | :---: | :--- | :--- |
| **Cropped / Extreme Close-up Photo** | Distorted garment placement on face/neck | **YES** | Missing torso landmarks | Pre-inference face/torso aspect ratio validation; prompt customer for waist-up or full-body photo. |
| **Multiple People in Photo** | Model attempts multi-target cloth transfer | **YES** | Ambiguous person segmentation | Pre-validation rejects multi-person images with helpful error message. |
| **Flat-Lay / Ghost Mannequin Garment** | Unnatural flat box appearance | **YES** | Lack of 3D volume in source garment | SVG contour mask + radial gradient drape deformation curve applied during transfer. |
| **Dark Black / Navy Garment on Dark Background** | Loss of garment boundary contrast | **YES** | Low contrast histogram | Color modulation & dynamic range boost prior to neural blend. |
| **Complex Semi-Sheer Sleeves / Dupatta** | Opaque unnatural block fill | **YES** | Single-layer mask blend | Multi-layer alpha masking preserving skin tone beneath semi-translucent organza / net textures. |
| **User Abandons Browser Tab Mid-Processing** | Zombie job / orphaned temp files | **YES** | Missing frontend disconnect hook | Automated background cron cleans jobs $> 1$ hr old; S3 lifecycle rule purges orphaned assets. |
