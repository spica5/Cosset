import axiosInstance, { endpoints } from 'src/utils/axios';

import { CONFIG } from 'src/config-global';

export type UploadFileToS3Input = {
  file: File;
  key: string;
  isPublic?: boolean;
  onProgress?: (percent: number) => void;
};

export type UploadFileToS3Result = {
  key: string;
  url: string;
};

type SignedUploadResponse = {
  key: string;
  uploadUrl: string;
  contentType: string;
  url: string;
};

type MultipartCreateResponse = {
  key: string;
  uploadId: string;
  contentType: string;
  url?: string;
};

type CompletedUploadPart = {
  partNumber: number;
  etag: string;
};

// Enable direct S3 upload by default since CORS is now configured on the bucket
const isDirectS3UploadEnabled = process.env.NEXT_PUBLIC_ENABLE_DIRECT_S3_UPLOAD === 'true';

// Threshold for using direct S3 upload (5MB) to avoid Vercel's request size limit
const DIRECT_UPLOAD_THRESHOLD = 5 * 1024 * 1024;

// Use direct signed PUT up to 512MB, then multipart with smaller parts as fallback.
const MULTIPART_UPLOAD_THRESHOLD = 512 * 1024 * 1024;
const MULTIPART_FALLBACK_THRESHOLD = 80 * 1024 * 1024;
const MULTIPART_PART_SIZE = 32 * 1024 * 1024;
const MULTIPART_PART_MAX_RETRIES = 3;
const UPLOAD_PART_TIMEOUT_MS = 30 * 60 * 1000;
const SERVER_STREAM_TIMEOUT_MS = 60 * 60 * 1000;

function isLocalBackend() {
  const serverUrl = CONFIG.serverUrl.trim();
  if (!serverUrl) {
    return false;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(serverUrl);
}

const getUploadEndpoint = (isPublic: boolean) =>
  isPublic ? `${endpoints.upload.image}?public=true` : endpoints.upload.image;

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function reportUploadProgress(onProgress: UploadFileToS3Input['onProgress'], percent: number) {
  if (!onProgress) {
    return;
  }

  onProgress(Math.min(100, Math.max(0, Math.round(percent))));
}

function uploadBlobWithProgress(
  uploadUrl: string,
  blob: Blob,
  onProgress?: (loaded: number, total: number) => void,
  contentType?: string,
): Promise<{ etag: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.timeout = UPLOAD_PART_TIMEOUT_MS;

    if (contentType) {
      xhr.setRequestHeader('Content-Type', contentType);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded, event.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = (xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag') || '').trim();
        resolve({ etag: etag || `part-${Date.now()}` });
        return;
      }

      const details = xhr.responseText?.trim();
      reject(
        new Error(
          details
            ? `Upload failed with status ${xhr.status}: ${details.slice(0, 200)}`
            : `Upload failed with status ${xhr.status}.`,
        ),
      );
    };

    xhr.onerror = () => reject(new Error('Upload failed due to a network or CORS error.'));
    xhr.onabort = () => reject(new Error('Upload was aborted.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out. Please try again on a stable connection.'));

    xhr.send(blob);
  });
}

async function uploadFileViaBackendProxy(
  file: File,
  key: string,
  isPublic: boolean,
  onProgress?: UploadFileToS3Input['onProgress'],
): Promise<UploadFileToS3Result> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('key', key);

  const res = await axiosInstance.post(getUploadEndpoint(isPublic), formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (!progressEvent.total) {
        return;
      }

      reportUploadProgress(
        onProgress,
        (progressEvent.loaded / progressEvent.total) * 100,
      );
    },
  });

  return {
    key: String(res.data?.key || key),
    url: String(res.data?.url || ''),
  };
}

async function uploadFileViaBackendStream(
  file: File,
  key: string,
  isPublic: boolean,
  onProgress?: UploadFileToS3Input['onProgress'],
): Promise<UploadFileToS3Result> {
  const contentType = (file.type || 'application/octet-stream').trim();

  reportUploadProgress(onProgress, 0);

  const res = await axiosInstance.put(endpoints.upload.stream, file, {
    params: {
      key,
      public: isPublic ? 'true' : 'false',
      contentType,
    },
    headers: {
      'Content-Type': contentType,
    },
    timeout: SERVER_STREAM_TIMEOUT_MS,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    onUploadProgress: (event) => {
      const total = event.total || file.size;
      if (total > 0) {
        reportUploadProgress(onProgress, (event.loaded / total) * 100);
      }
    },
  });

  reportUploadProgress(onProgress, 100);

  return {
    key: String(res.data?.key || key),
    url: String(res.data?.url || ''),
  };
}

async function getSignedUploadPayload(
  file: File,
  key: string,
  isPublic: boolean,
): Promise<SignedUploadResponse> {
  const requestedContentType = (file.type || 'application/octet-stream').trim();

  const res = await axiosInstance.get(endpoints.upload.sign, {
    params: {
      key,
      public: isPublic ? 'true' : 'false',
      contentType: requestedContentType,
    },
    timeout: 60_000,
  });

  const uploadUrl = String(res.data?.uploadUrl || '').trim();
  if (!uploadUrl) {
    throw new Error('Signed upload URL is missing.');
  }

  return {
    key: String(res.data?.key || key).trim(),
    uploadUrl,
    contentType: String(res.data?.contentType || requestedContentType).trim(),
    url: String(res.data?.url || '').trim(),
  };
}

async function createMultipartUpload(
  file: File,
  key: string,
  isPublic: boolean,
): Promise<MultipartCreateResponse> {
  const requestedContentType = (file.type || 'application/octet-stream').trim();

  const res = await axiosInstance.post(endpoints.upload.multipart, {
    action: 'create',
    key,
    public: isPublic,
    contentType: requestedContentType,
  }, {
    timeout: 120_000,
  });

  const uploadId = String(res.data?.uploadId || '').trim();
  if (!uploadId) {
    throw new Error('Failed to initialize multipart upload.');
  }

  return {
    key: String(res.data?.key || key).trim(),
    uploadId,
    contentType: String(res.data?.contentType || requestedContentType).trim(),
    url: String(res.data?.url || '').trim(),
  };
}

async function signMultipartParts(
  key: string,
  uploadId: string,
  partNumbers: number[],
): Promise<Map<number, string>> {
  const res = await axiosInstance.post(endpoints.upload.multipart, {
    action: 'sign-parts',
    key,
    uploadId,
    partNumbers,
  }, {
    timeout: 120_000,
  });

  const partsRaw = Array.isArray(res.data?.parts) ? res.data.parts : [];
  const signedUrls = new Map<number, string>();

  partsRaw.forEach((part: { partNumber?: unknown; uploadUrl?: unknown }) => {
    const partNumber = Number(part?.partNumber);
    const uploadUrl = String(part?.uploadUrl || '').trim();
    if (Number.isInteger(partNumber) && partNumber > 0 && uploadUrl) {
      signedUrls.set(partNumber, uploadUrl);
    }
  });

  if (signedUrls.size !== partNumbers.length) {
    throw new Error('Failed to sign one or more multipart upload parts.');
  }

  return signedUrls;
}

async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: CompletedUploadPart[],
  isPublic: boolean,
  partCount: number,
): Promise<UploadFileToS3Result> {
  const res = await axiosInstance.post(endpoints.upload.multipart, {
    action: 'complete',
    key,
    uploadId,
    public: isPublic,
    partCount,
    parts,
  }, {
    timeout: 120_000,
  });

  return {
    key: String(res.data?.key || key).trim(),
    url: String(res.data?.url || '').trim(),
  };
}

async function abortMultipartUpload(key: string, uploadId: string) {
  try {
    await axiosInstance.post(endpoints.upload.multipart, {
      action: 'abort',
      key,
      uploadId,
    });
  } catch (error) {
    console.warn('Failed to abort multipart upload.', error);
  }
}

async function uploadPartWithRetry(
  uploadUrl: string,
  blob: Blob,
  partNumber: number,
  onPartProgress?: (loaded: number, total: number) => void,
  attempt = 1,
): Promise<CompletedUploadPart> {
  try {
    const { etag } = await uploadBlobWithProgress(uploadUrl, blob, onPartProgress);

    return {
      partNumber,
      etag: etag || `part-${partNumber}`,
    };
  } catch (error) {
    if (attempt >= MULTIPART_PART_MAX_RETRIES) {
      throw error instanceof Error
        ? error
        : new Error(`Multipart part ${partNumber} upload failed.`);
    }

    await sleep(400 * 2 ** (attempt - 1));
    return uploadPartWithRetry(uploadUrl, blob, partNumber, onPartProgress, attempt + 1);
  }
}

export async function uploadFileToS3Direct({
  file,
  key,
  isPublic = false,
  onProgress,
}: UploadFileToS3Input): Promise<UploadFileToS3Result> {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    throw new Error('Upload key is required.');
  }

  const signed = await getSignedUploadPayload(file, normalizedKey, isPublic);
  const contentType = signed.contentType || file.type || 'application/octet-stream';

  reportUploadProgress(onProgress, 1);

  await uploadBlobWithProgress(
    signed.uploadUrl,
    file,
    (loaded, total) => {
      reportUploadProgress(onProgress, (loaded / total) * 100);
    },
    contentType,
  );

  reportUploadProgress(onProgress, 100);

  return {
    key: signed.key || normalizedKey,
    url: signed.url,
  };
}

async function uploadMultipartPartsSequentially(input: {
  file: File;
  uploadKey: string;
  uploadId: string;
  partCount: number;
  partNumber?: number;
  uploadedBytes?: number;
  completedParts?: CompletedUploadPart[];
  onProgress?: UploadFileToS3Input['onProgress'];
}): Promise<CompletedUploadPart[]> {
  const {
    file,
    uploadKey,
    uploadId,
    partCount,
    partNumber = 1,
    uploadedBytes = 0,
    completedParts = [],
    onProgress,
  } = input;

  if (partNumber > partCount) {
    return [...completedParts].sort((a, b) => a.partNumber - b.partNumber);
  }

  const signedUrls = await signMultipartParts(uploadKey, uploadId, [partNumber]);
  const uploadUrl = signedUrls.get(partNumber);
  if (!uploadUrl) {
    throw new Error(`Missing signed URL for multipart part ${partNumber}.`);
  }

  const start = (partNumber - 1) * MULTIPART_PART_SIZE;
  const end = Math.min(start + MULTIPART_PART_SIZE, file.size);
  const blob = file.slice(start, end);
  const partBaseBytes = uploadedBytes;

  const uploadedPart = await uploadPartWithRetry(
    uploadUrl,
    blob,
    partNumber,
    (loaded) => {
      const currentTotal = partBaseBytes + loaded;
      reportUploadProgress(onProgress, (currentTotal / file.size) * 100);
    },
  );

  const nextUploadedBytes = uploadedBytes + blob.size;
  reportUploadProgress(onProgress, (nextUploadedBytes / file.size) * 100);

  return uploadMultipartPartsSequentially({
    file,
    uploadKey,
    uploadId,
    partCount,
    partNumber: partNumber + 1,
    uploadedBytes: nextUploadedBytes,
    completedParts: [...completedParts, uploadedPart],
    onProgress,
  });
}

async function uploadFileToS3Multipart({
  file,
  key,
  isPublic = false,
  onProgress,
}: UploadFileToS3Input): Promise<UploadFileToS3Result> {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    throw new Error('Upload key is required.');
  }

  const partCount = Math.max(1, Math.ceil(file.size / MULTIPART_PART_SIZE));
  const created = await createMultipartUpload(file, normalizedKey, isPublic);
  const uploadKey = created.key || normalizedKey;

  reportUploadProgress(onProgress, 0);

  try {
    const completedParts = await uploadMultipartPartsSequentially({
      file,
      uploadKey,
      uploadId: created.uploadId,
      partCount,
      onProgress,
    });

    const result = await completeMultipartUpload(
      uploadKey,
      created.uploadId,
      completedParts,
      isPublic,
      partCount,
    );

    reportUploadProgress(onProgress, 100);

    return result;
  } catch (error) {
    await abortMultipartUpload(uploadKey, created.uploadId);
    throw error;
  }
}

export async function uploadFileToS3({
  file,
  key,
  isPublic = false,
  onProgress,
}: UploadFileToS3Input): Promise<UploadFileToS3Result> {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    throw new Error('Upload key is required.');
  }

  // Files above 512MB always use multipart (or server stream on local dev).
  if (file.size >= MULTIPART_UPLOAD_THRESHOLD) {
    if (isLocalBackend()) {
      return uploadFileViaBackendStream(file, normalizedKey, isPublic, onProgress);
    }

    return uploadFileToS3Multipart({ file, key: normalizedKey, isPublic, onProgress });
  }

  // Use direct S3 upload for medium/large files to avoid Vercel's request size limit (6MB)
  const useDirectUpload = isDirectS3UploadEnabled || file.size > DIRECT_UPLOAD_THRESHOLD;

  if (!useDirectUpload) {
    return uploadFileViaBackendProxy(file, normalizedKey, isPublic, onProgress);
  }

  try {
    return await uploadFileToS3Direct({ file, key: normalizedKey, isPublic, onProgress });
  } catch (error) {
    if (file.size >= MULTIPART_FALLBACK_THRESHOLD) {
      if (isLocalBackend()) {
        try {
          console.warn('Direct S3 upload failed, retrying through backend stream.', error);
          reportUploadProgress(onProgress, 0);
          return await uploadFileViaBackendStream(file, normalizedKey, isPublic, onProgress);
        } catch (streamError) {
          console.warn('Backend stream upload failed, retrying with multipart.', streamError);
          reportUploadProgress(onProgress, 0);
          return uploadFileToS3Multipart({ file, key: normalizedKey, isPublic, onProgress });
        }
      }

      console.warn('Direct S3 upload failed, retrying with multipart.', error);
      reportUploadProgress(onProgress, 0);
      return uploadFileToS3Multipart({ file, key: normalizedKey, isPublic, onProgress });
    }

    if (file.size > DIRECT_UPLOAD_THRESHOLD) {
      throw error;
    }

    console.warn('Direct S3 upload failed, falling back to backend proxy.', error);
    return uploadFileViaBackendProxy(file, normalizedKey, isPublic, onProgress);
  }
}

export async function deleteUploadedFile(key: string) {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    throw new Error('Upload key is required.');
  }

  await axiosInstance.delete(endpoints.upload.delete, {
    params: { key: normalizedKey },
  });
}
