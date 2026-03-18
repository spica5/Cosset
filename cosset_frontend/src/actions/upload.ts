import axiosInstance, { endpoints } from 'src/utils/axios';
import { uploadFileToS3Direct as uploadFileToS3DirectAction } from './upload-server';

export type UploadFileToS3Input = {
  file: File;
  key: string;
  isPublic?: boolean;
};

export type UploadFileToS3Result = {
  key: string;
  url: string;
};

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

export async function uploadFileToS3Direct({
  file,
  key,
  isPublic = false,
}: UploadFileToS3Input): Promise<UploadFileToS3Result> {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    throw new Error('Upload key is required.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('key', normalizedKey);
  formData.append('isPublic', isPublic ? '1' : '0');

  return uploadFileToS3DirectAction(formData);
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

  try {
    return await uploadFileToS3Direct({ file, key: normalizedKey, isPublic });
  } catch (error) {
    console.warn('Direct S3 upload failed, falling back to backend proxy.', error);
    return uploadFileViaBackendProxy(file, normalizedKey, isPublic);
  }
}
