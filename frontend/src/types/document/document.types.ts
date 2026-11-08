export type DocumentItem = {
  id: string;
  clubId: string;
  ownerId: string;
  name: string;
  path: string;
  version: number;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  appDetailKey?: string;
  deleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentVersion = {
  id: string;
  documentId: string;
  version: number;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  uploadedBy: string;
  createdAt: string;
};
