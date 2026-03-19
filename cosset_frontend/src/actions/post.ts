import type { IPostItem } from 'src/types/post';

import useSWR, { mutate } from 'swr';
import { useMemo, useCallback } from 'react';

import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const POST_LIST_ENDPOINT = endpoints.post.list;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

type PostsData = {
  posts?: IPostItem[];
};

export function useGetPosts(customerId?: string | number) {
  const url = customerId
    ? `${POST_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(customerId))}`
    : POST_LIST_ENDPOINT;

  const { data, isLoading, error, isValidating } = useSWR<PostsData>(url, fetcher, swrOptions);
  const refreshPosts = useCallback(() => mutate(url), [url]);

  const memoizedValue = useMemo(() => {
    const posts = data?.posts || [];

    return {
      posts,
      postsLoading: isLoading,
      postsError: error,
      postsValidating: isValidating,
      postsEmpty: !isLoading && !posts.length,
      refreshPosts,
    };
  }, [data?.posts, error, isLoading, isValidating, refreshPosts]);

  return memoizedValue;
}

// ----------------------------------------------------------------------

type PostData = {
  post?: IPostItem;
};

export function useGetPost(postId: string | number | '') {
  const url = postId ? `${endpoints.post.details}?id=${encodeURIComponent(String(postId))}` : null;

  const { data, isLoading, error, isValidating } = useSWR<PostData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      post: data?.post,
      postLoading: isLoading,
      postError: error,
      postValidating: isValidating,
    }),
    [data?.post, error, isLoading, isValidating],
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export async function createPost(post: Omit<IPostItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const data = { post };
  const res = await axios.post(endpoints.post.add, data);

  mutate(POST_LIST_ENDPOINT);
  if (post.customerId) {
    mutate(`${POST_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(post.customerId))}`);
  }

  return res.data;
}

// ----------------------------------------------------------------------

export async function updatePost(
  postId: string | number,
  updates: Partial<Omit<IPostItem, 'id' | 'createdAt' | 'updatedAt'>>,
) {
  const data = { post: updates };
  const res = await axios.put(endpoints.post.update(postId), data);

  mutate(POST_LIST_ENDPOINT);
  if (updates.customerId) {
    mutate(`${POST_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(updates.customerId))}`);
  }
  // Invalidate the individual post cache.
  mutate(`${endpoints.post.details}?id=${encodeURIComponent(String(postId))}`);

  return res.data;
}

// ----------------------------------------------------------------------

export async function deletePost(
  postId: string | number,
  customerId?: string | number,
) {
  const res = await axios.delete(endpoints.post.delete(postId));

  mutate(POST_LIST_ENDPOINT);
  if (customerId) {
    mutate(`${POST_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(customerId))}`);
  }

  return res.data;
}
