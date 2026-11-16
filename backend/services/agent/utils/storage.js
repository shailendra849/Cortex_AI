import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Storage } from '@google-cloud/storage';

const configuredProvider = (process.env.STORAGE_PROVIDER || 's3').toLowerCase();
const provider = configuredProvider === 'gcp' ? 'gcs' : configuredProvider;

if (!['s3', 'gcs', 'local'].includes(provider)) {
  throw new Error(`Unsupported STORAGE_PROVIDER "${provider}". Use "s3", "gcs", or "local".`);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const localStorageDir = path.resolve(
  process.env.LOCAL_STORAGE_DIR || path.join(__dirname, '..', 'local-storage')
);

if (provider === 'local' && !fs.existsSync(localStorageDir)) {
  fs.mkdirSync(localStorageDir, { recursive: true });
}

// Optional S3-compatible endpoint (MinIO, LocalStack, adobe/s3mock, R2). Omit for real AWS S3.
const s3Endpoint = process.env.AWS_ENDPOINT || process.env.S3_ENDPOINT;

const s3Client = provider === 's3'
  ? new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
      ...(s3Endpoint
        ? {
            endpoint: s3Endpoint,
            forcePathStyle: true,
          }
        : {}),
    })
  : null;

const gcsCredentials = process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY
  ? {
      client_email: process.env.GCS_CLIENT_EMAIL,
      private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }
  : undefined;
const gcsClient = provider === 'gcs'
  ? new Storage({
      projectId: process.env.GCS_PROJECT_ID || undefined,
      credentials: gcsCredentials,
    })
  : null;

const getBucketName = () => {
  if (provider === 'local') {
    return 'local';
  }

  const bucketName = provider === 's3'
    ? (process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME)
    : (process.env.GCS_BUCKET || process.env.GCS_BUCKET_NAME);

  if (!bucketName) {
    throw new Error(`A bucket name is required for STORAGE_PROVIDER=${provider}.`);
  }

  return bucketName;
};

export const uploadToStorage = async (buffer, fileName, contentType) => {
  if (provider === 'local') {
    const safeName = path.basename(fileName);
    const dest = path.join(localStorageDir, safeName);
    await fs.promises.writeFile(dest, buffer);
    return safeName;
  }

  const bucketName = getBucketName();

  if (provider === 'gcs') {
    await gcsClient.bucket(bucketName).file(fileName).save(buffer, {
      resumable: false,
      metadata: { contentType },
    });
  } else {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
    }));
  }

  return fileName;
};

export const getDownloadUrl = async (fileName, expiresIn = 600) => {
  if (provider === 'local') {
    const safeName = path.basename(fileName);
    const base =
      process.env.PUBLIC_FILE_BASE_URL ||
      `http://localhost:${process.env.PORT || 8003}/files`;
    return `${base.replace(/\/$/, '')}/${encodeURIComponent(safeName)}`;
  }

  const bucketName = getBucketName();

  if (provider === 'gcs') {
    const [url] = await gcsClient.bucket(bucketName).file(fileName).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });
    return url;
  }

  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: bucketName, Key: fileName }),
    { expiresIn }
  );
};
