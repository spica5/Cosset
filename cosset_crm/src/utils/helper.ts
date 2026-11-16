import { getS3SignedUrl as fetchSignedUrl } from "src/actions/user";

export async function getS3SignedUrl(key?: string | null): Promise<string> {
  return fetchSignedUrl(key);
}
