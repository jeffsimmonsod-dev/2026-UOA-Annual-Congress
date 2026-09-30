export class ObjectNotFoundError extends Error {}

export class ObjectStorageService {
  async getObjectEntityUploadURL() {
    throw new Error("Object storage upload is not part of this integration suite");
  }

  normalizeObjectEntityPath() {
    throw new Error("Object storage path normalization is not part of this integration suite");
  }

  async deleteObjectEntity() {}

  async getObjectEntityFile() {
    throw new Error("Object storage reads are not part of this integration suite");
  }

  async downloadObject() {
    throw new Error("Object storage reads are not part of this integration suite");
  }
}

export const objectStorageClient = {};

export async function uploadPhotoToDrive() {
  throw new Error("Google Drive uploads are not part of this integration suite");
}

export async function deleteDriveFile() {}

export async function ensureConferencesTable() {}