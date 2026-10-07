import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { OfficeParser } from 'officeparser';
import { config } from '../config.js';
import { HttpError } from '../lib/http-error.js';
import { resourceContentType } from './movies/storage.js';

const MAX_EXTRACTION_BYTES = 24 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 40_000;

interface StoredResource {
  fileName: string;
  localPath?: string;
}

function storedResource(resourceUrl: string): StoredResource {
  const local = resourceUrl.match(/^\/api\/content\/uploads\/([a-f0-9-]{36}\.(?:pdf|doc|docx|ppt|pptx|mp4|webm|ogg|mov|m4v|mkv))$/i);
  if (local) return { fileName: local[1], localPath: path.join(config.content.resourceUploadDir, local[1]) };

  const prefix = `${config.movies.storage.publicUrl}/resources/`;
  if (config.movies.storage.enabled && resourceUrl.startsWith(prefix)) {
    const fileName = decodeURIComponent(resourceUrl.slice(prefix.length));
    if (/^[a-f0-9-]{36}\.(?:pdf|doc|docx|ppt|pptx|mp4|webm|ogg|mov|m4v|mkv)$/i.test(fileName)) {
      return { fileName };
    }
  }

  throw HttpError.badRequest('A resource link is invalid or is not an uploaded learning resource.');
}

async function resourceBuffer(resourceUrl: string): Promise<{ fileName: string; buffer: Buffer }> {
  const stored = storedResource(resourceUrl);
  if (stored.localPath) {
    const info = await stat(stored.localPath);
    if (info.size > MAX_EXTRACTION_BYTES) {
      throw HttpError.badRequest('Documents used for question drafting must be smaller than 24 MB.');
    }
    const buffer = await readFile(stored.localPath);
    return { fileName: stored.fileName, buffer };
  }

  const response = await fetch(resourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw HttpError.badRequest(`Could not read uploaded resource ${stored.fileName}.`);
  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (contentLength > MAX_EXTRACTION_BYTES) {
    throw HttpError.badRequest('Documents used for question drafting must be smaller than 24 MB.');
  }
  if (!response.body) throw HttpError.badRequest(`Could not read uploaded resource ${stored.fileName}.`);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_EXTRACTION_BYTES) {
      await reader.cancel();
      throw HttpError.badRequest('Documents used for question drafting must be smaller than 24 MB.');
    }
    chunks.push(value);
  }
  const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), size);
  return { fileName: stored.fileName, buffer };
}

export async function extractResourceText(resourceUrl: string): Promise<string> {
  const stored = storedResource(resourceUrl);
  if (resourceContentType(stored.fileName)?.startsWith('video/')) return '';
  const { fileName, buffer } = await resourceBuffer(resourceUrl);

  try {
    const parsed = await OfficeParser.parseOffice(buffer);
    const { value } = await parsed.to('text');
    return value.trim().slice(0, MAX_EXTRACTED_CHARACTERS);
  } catch {
    throw HttpError.badRequest(`Could not extract text from ${fileName}. Check that the file is not password-protected.`);
  }
}