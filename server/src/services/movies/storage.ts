import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { config } from '../../config.js';
import { HttpError } from '../../lib/http-error.js';

const VIDEO_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
  '.mkv': 'video/x-matroska',
};

const client = config.movies.storage.enabled
  ? new S3Client({
      region: config.movies.storage.region,
      endpoint: config.movies.storage.endpoint || undefined,
      forcePathStyle: config.movies.storage.forcePathStyle,
      credentials: {
        accessKeyId: config.movies.storage.accessKeyId,
        secretAccessKey: config.movies.storage.secretAccessKey,
      },
    })
  : null;

export function movieContentType(fileName: string): string | null {
  return VIDEO_TYPES[path.extname(fileName).toLowerCase()] ?? null;
}

export async function createMovieUploadTicket(fileName: string, size: number) {
  if (!client || !config.movies.storage.enabled) {
    throw new HttpError(503, 'UPLOAD_STORAGE_UNAVAILABLE', 'Movie object storage is not configured.');
  }
  if (size < 1 || size > config.movies.uploadMaxBytes) {
    throw HttpError.badRequest(`Choose a video smaller than ${config.movies.uploadMaxBytes / 1024 / 1024} MB.`);
  }

  const contentType = movieContentType(fileName);
  if (!contentType) throw HttpError.badRequest('Choose an MP4, WebM, OGG, MOV, M4V, or MKV video file.');

  const key = `movies/${randomUUID()}${path.extname(fileName).toLowerCase()}`;
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.movies.storage.bucket,
      Key: key,
      ContentType: contentType,
      CacheControl: 'public, max-age=3600',
    }),
    { expiresIn: 900 },
  );

  return {
    uploadUrl,
    streamUrl: `${config.movies.storage.publicUrl}/movies/${key.slice('movies/'.length)}`,
    headers: { 'Content-Type': contentType },
    expiresInSeconds: 900,
  };
}

export async function deleteMovieObject(streamUrl: string): Promise<void> {
  if (!client || !config.movies.storage.enabled) return;

  const prefix = `${config.movies.storage.publicUrl}/movies/`;
  if (!streamUrl.startsWith(prefix)) return;

  const fileName = decodeURIComponent(streamUrl.slice(prefix.length));
  if (!/^[a-f0-9-]{36}\.(mp4|webm|ogg|mov|m4v|mkv)$/i.test(fileName)) return;

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.movies.storage.bucket,
      Key: `movies/${fileName}`,
    }),
  );
}