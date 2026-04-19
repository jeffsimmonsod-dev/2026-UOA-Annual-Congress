// Google Drive integration via Replit Connectors SDK
// Uploads photos to a "UOA Congress 2026 Photos" folder in the connected Google Drive account
import { ReplitConnectors } from "@replit/connectors-sdk";

const FOLDER_NAME = "UOA Congress 2026 Photos";

let cachedFolderId: string | null = null;

function getConnectors() {
  return new ReplitConnectors();
}

async function driveRequest(path: string, options: RequestInit = {}) {
  const connectors = getConnectors();
  const resp = await connectors.proxy("google-drive", path, options);
  return resp;
}

async function ensureDriveFolder(): Promise<string> {
  if (cachedFolderId) return cachedFolderId;

  // Search for existing folder
  const searchResp = await driveRequest(
    `/drive/v3/files?q=${encodeURIComponent(
      `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`
    )}&fields=files(id,name)`,
    { method: "GET" }
  );
  const searchData = await searchResp.json() as { files?: Array<{ id: string; name: string }> };

  if (searchData.files && searchData.files.length > 0) {
    cachedFolderId = searchData.files[0].id;
    return cachedFolderId!;
  }

  // Create the folder
  const createResp = await driveRequest("/drive/v3/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  const createData = await createResp.json() as { id: string };
  cachedFolderId = createData.id;
  return cachedFolderId!;
}

export async function uploadPhotoToDrive(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
  uploaderName: string,
  caption: string
): Promise<string | null> {
  try {
    const folderId = await ensureDriveFolder();

    const metadata = {
      name: fileName,
      parents: [folderId],
      description: `Uploaded by: ${uploaderName}${caption ? `\nCaption: ${caption}` : ""}`,
    };

    // Use multipart upload
    const boundary = "----CongressPhotoBoundary" + Date.now();
    const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const filePart = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const end = `\r\n--${boundary}--`;

    const metaBuf = Buffer.from(metaPart, "utf-8");
    const filePartBuf = Buffer.from(filePart, "utf-8");
    const endBuf = Buffer.from(end, "utf-8");
    const body = Buffer.concat([metaBuf, filePartBuf, fileBuffer, endBuf]);

    const uploadResp = await driveRequest(
      "/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      }
    );

    const uploadData = await uploadResp.json() as { id?: string; webViewLink?: string };
    return uploadData.webViewLink ?? null;
  } catch (err) {
    // Non-fatal: log but don't break the photo upload flow
    console.error("[googleDrive] upload failed:", err);
    return null;
  }
}
