import axiosInstance, { endpoints } from 'src/utils/axios';

export type UploadFileToS3Input = {
  file: File;
  key: string;
  isPublic?: boolean;
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

// Enable direct S3 upload by default since CORS is now configured on the bucket
const isDirectS3UploadEnabled = process.env.NEXT_PUBLIC_ENABLE_DIRECT_S3_UPLOAD === 'true';

const getUploadEndpoint = (isPublic: boolean) =>
  isPublic ? `${endpoints.upload.image}?public=true` : endpoints.upload.image;

async function uploadFileViaBackendProxy(file: File, key: string, isPublic: boolean): Promise<UploadFileToS3Result> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('key', key);

  const res = await axiosInstance.post(getUploadEndpoint(isPublic), formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

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

export async function uploadFileToS3Direct({
  file,
  key,
  isPublic = false,
}: UploadFileToS3Input): Promise<UploadFileToS3Result> {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    throw new Error('Upload key is required.');
  }

  const signed = await getSignedUploadPayload(file, normalizedKey, isPublic);

  const headers: Record<string, string> = {
    'Content-Type': signed.contentType || 'application/octet-stream',
  };

  const putRes = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers,
    body: file,
  });

  if (!putRes.ok) {
    const message = await putRes.text().catch(() => '');
    throw new Error(message || `Direct S3 upload failed with status ${putRes.status}.`);
  }

  return {
    key: signed.key || normalizedKey,
    url: signed.url,
  };
}

export async function uploadFileToS3({
  file,
  key,
  isPublic = false,
}: UploadFileToS3Input): Promise<UploadFileToS3Result> {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    throw new Error('Upload key is required.');
  }

  // Direct browser-to-S3 upload requires bucket CORS. Keep proxy upload as
  // the safe default unless explicitly enabled.
  if (!isDirectS3UploadEnabled) {
    return uploadFileViaBackendProxy(file, normalizedKey, isPublic);
  }

  try {
    return await uploadFileToS3Direct({ file, key: normalizedKey, isPublic });
  } catch (error) {
    console.warn('Direct S3 upload failed, falling back to backend proxy.', error);
    return uploadFileViaBackendProxy(file, normalizedKey, isPublic);
  }
}
