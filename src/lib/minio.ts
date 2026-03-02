import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = `${process.env.MINIO_USE_SSL === "true" ? "https" : "http"}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`;

export const s3Client = new S3Client({
  endpoint,
  region: process.env.MINIO_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
  },
  forcePathStyle: true, // Required for MinIO
});

export const BUCKETS = {
  STUDENT_PHOTOS: "student-photos",
  STUDENT_DOCUMENTS: "student-documents",
  ASSIGNMENT_FILES: "assignment-files",
  FEE_RECEIPTS: "fee-receipts",
  PAYSLIPS: "payslips",
  LIBRARY_COVERS: "library-covers",
  DB_BACKUPS: "db-backups",
  STAFF_DOCUMENTS: "staff-documents",
  GENERAL: "general",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

export async function ensureBucketExists(bucket: BucketName): Promise<void> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

export async function uploadFile(
  bucket: BucketName,
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await ensureBucketExists(bucket);
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

export async function getPresignedUrl(
  bucket: BucketName,
  key: string,
  expiresIn = 900 // 15 minutes
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteFile(
  bucket: BucketName,
  key: string
): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function buildKey(
  entityType: string,
  entityId: string,
  filename: string
): string {
  const year = new Date().getFullYear();
  return `${entityType}/${entityId}/${year}/${filename}`;
}
