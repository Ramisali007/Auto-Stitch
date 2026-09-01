# Virtual Try-On Subsystem Architecture

## 1. System Component Diagram

```
+-------------------------------------------------------------------------+
|                              FRONTEND                                   |
|  [ProductDetail Page / VirtualTryOn Studio]                             |
|  - Client-side Resize & EXIF Stripper                                  |
|  - Real Progress State Machine (Preparing -> Segmenting -> Generating)  |
|  - Before / After Split Slider & Instant Local Download                 |
+------------------------------------+------------------------------------+
                                     | HTTPS / WSS
                                     v
+------------------------------------+------------------------------------+
|                             BACKEND API                                 |
|  [Express Router: /api/vto]                                             |
|  - Auth & Ownership Middleware                                          |
|  - Rate Limiter & Magic Byte Validator                                  |
|  - Trusted Product Resolver (Database)                                  |
+-------------------+----------------+--------------------+---------------+
                    |                |                    |
                    v                v                    v
         +----------+---+    +-------+------+     +-------+------+
         |   MongoDB    |    |  S3 Storage  |     | Async Queue  |
         |  (TryOnJob)  |    |  (Private)   |     |  (BullMQ /   |
         +--------------+    +--------------+     |  FIFO Worker)|
                                                  +-------+------+
                                                          |
                                                          v
                                                  +-------+------+
                                                  |  GPU Worker  |
                                                  | (Python VTO /|
                                                  | Sharp Fallback)
                                                  +-------+------+
                                                          |
                                                          v
                                                  +-------+------+
                                                  | Cleanup Cron |
                                                  | (Purges Temp)|
                                                  +--------------+
```

## 2. Asynchronous Flow Sequence

1. **Session Setup (`POST /api/vto/session`)**: Frontend submits `productId`. Backend verifies product existence and boutique ownership and creates a pending `TryOnJob`.
2. **Secure Upload (`POST /api/vto/jobs`)**: Frontend uploads sanitized customer photo. Backend saves to private S3 or isolated temp directory.
3. **Queue Enqueue**: Job is enqueued into the async FIFO worker.
4. **Worker Processing**: Worker executes preprocessing, cloth transfer inference, and pose preservation composition.
5. **Auto Source Deletion**: Source customer image is deleted immediately upon result output creation.
6. **Result Polling (`GET /api/vto/jobs/:jobId`)**: Frontend polls progress and receives the completed result URL.
7. **Cleanup**: User download or cancel triggers cleanup, with cron providing 1-hour fail-safe expiration.
