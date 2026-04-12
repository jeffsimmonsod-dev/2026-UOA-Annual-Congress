import { Router, type Request, type Response } from "express";
import { Readable } from "stream";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router = Router();
const objectStorageService = new ObjectStorageService();

interface Photo {
  id: string;
  objectPath: string;
  uploaderName: string;
  caption: string;
  likedBy: Set<string>;
  createdAt: string;
}

const photos = new Map<string, Photo>();

function photoToJSON(photo: Photo, deviceId?: string) {
  return {
    id: photo.id,
    objectPath: photo.objectPath,
    uploaderName: photo.uploaderName,
    caption: photo.caption,
    likes: photo.likedBy.size,
    likedByMe: deviceId ? photo.likedBy.has(deviceId) : false,
    createdAt: photo.createdAt,
  };
}

router.post("/photos/upload-url", async (_req: Request, res: Response) => {
  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate upload URL", details: String(err) });
  }
});

router.post("/photos", (req: Request, res: Response) => {
  const { objectPath, uploaderName, caption, deviceId } = req.body as {
    objectPath?: string;
    uploaderName?: string;
    caption?: string;
    deviceId?: string;
  };

  if (!objectPath || !uploaderName) {
    res.status(400).json({ error: "objectPath and uploaderName are required" });
    return;
  }

  const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
  const photo: Photo = {
    id,
    objectPath,
    uploaderName: uploaderName.trim().slice(0, 50),
    caption: (caption ?? "").trim().slice(0, 200),
    likedBy: new Set(deviceId ? [deviceId] : []),
    createdAt: new Date().toISOString(),
  };

  photos.set(id, photo);
  res.status(201).json(photoToJSON(photo, deviceId));
});

router.get("/photos", (req: Request, res: Response) => {
  const deviceId = req.query.deviceId as string | undefined;
  const list = Array.from(photos.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((p) => photoToJSON(p, deviceId));
  res.json({ photos: list });
});

router.post("/photos/:id/like", (req: Request, res: Response) => {
  const photo = photos.get(req.params.id);
  if (!photo) {
    res.status(404).json({ error: "Photo not found" });
    return;
  }

  const { deviceId } = req.body as { deviceId?: string };
  if (!deviceId) {
    res.status(400).json({ error: "deviceId required" });
    return;
  }

  if (photo.likedBy.has(deviceId)) {
    photo.likedBy.delete(deviceId);
  } else {
    photo.likedBy.add(deviceId);
  }

  res.json(photoToJSON(photo, deviceId));
});

router.delete("/photos/:id", (req: Request, res: Response) => {
  if (!photos.has(req.params.id)) {
    res.status(404).json({ error: "Photo not found" });
    return;
  }
  photos.delete(req.params.id);
  res.json({ success: true });
});

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
