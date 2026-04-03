import type { IPostItem, IPostCommentItem } from 'src/types/post';

import useSWR, { mutate } from 'swr';
import { useMemo, useCallback } from 'react';

import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const POST_LIST_ENDPOINT = endpoints.post.list;
const POST_COMMENTS_ENDPOINT = endpoints.post.comments;

const normalizeCommentTargetType = (targetType?: string) =>
  targetType === 'collection-item' ? 'drawer' : targetType || 'community';

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

// ----------------------------------------------------------------------

type PostViewData = {
  totalViews?: number;
  alreadyViewed?: boolean;
  viewedAt?: string | null;
};

/**
 * Record a view for a community post.
 * The backend increments total_views only when this customer has not viewed it before.
 */
export async function recordPostView(postId: string | number): Promise<PostViewData> {
  try {
    const res = await axios.post<PostViewData>(endpoints.post.view, { postId: Number(postId) });

    // Only revalidate the individual post detail cache.
    // Mutating the full list triggers a re-fetch of all cards which can cause
    // PostItemForm components to unmount/remount and reset localTotalViews state.
    mutate(`${endpoints.post.details}?id=${encodeURIComponent(String(postId))}`);

    return res.data;
  } catch {
    return {};
  }
}

// ----------------------------------------------------------------------

type PostCommentsData = {
  comments?: IPostCommentItem[];
};

const normalizeCommentVisible = (visible: unknown): boolean => visible === 1;

export function useGetPostComments(postId: string | number | '', targetType: string = 'community') {
  const normalizedTargetType = normalizeCommentTargetType(targetType);
  const url = postId
    ? `${POST_COMMENTS_ENDPOINT}?targetId=${encodeURIComponent(String(postId))}&targetType=${encodeURIComponent(normalizedTargetType)}`
    : null;

  const { data, isLoading, error, isValidating } = useSWR<PostCommentsData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      comments: (data?.comments || []).map((comment) => ({
        ...comment,
        visible: normalizeCommentVisible(comment.visible),
      })),
      commentsLoading: isLoading,
      commentsError: error,
      commentsValidating: isValidating,
      commentsEmpty: !isLoading && !(data?.comments || []).length,
      refreshComments: () => (url ? mutate(url) : Promise.resolve(undefined)),
    }),
    [data?.comments, error, isLoading, isValidating, url],
  );

  return memoizedValue;
}

export async function addPostComment(params: {
  targetId: string | number;
  comment: string;
  targetType?: string;
  customerId?: string | number | null;
  prevCustomer?: string | null;
  visible?: boolean;
}) {
  const normalizedTargetType = normalizeCommentTargetType(params.targetType);
  const payload = {
    targetId: Number(params.targetId),
    targetType: normalizedTargetType,
    comment: params.comment,
    customerId: params.customerId ?? undefined,
    prevCustomer: params.prevCustomer ?? undefined,
    visible: params.visible ?? true,
  };

  const res = await axios.post(endpoints.post.comments, payload);

  const commentsUrl = `${POST_COMMENTS_ENDPOINT}?targetId=${encodeURIComponent(String(params.targetId))}&targetType=${encodeURIComponent(payload.targetType)}`;
  mutate(commentsUrl);

  return res.data;
}

export async function deletePostComment(params: {
  commentId: string | number;
  targetId: string | number;
  targetType?: string;
}) {
  const normalizedTargetType = normalizeCommentTargetType(params.targetType);
  const res = await axios.delete(
    `${endpoints.post.comments}?commentId=${encodeURIComponent(String(params.commentId))}`,
  );

  const commentsUrl = `${POST_COMMENTS_ENDPOINT}?targetId=${encodeURIComponent(String(params.targetId))}&targetType=${encodeURIComponent(normalizedTargetType)}`;
  mutate(commentsUrl);

  return res.data;
}

export async function updatePostCommentVisibility(params: {
  commentId: string | number;
  visible: boolean;
  targetId: string | number;
  targetType?: string;
}) {
  const normalizedTargetType = normalizeCommentTargetType(params.targetType);
  const res = await axios.patch(endpoints.post.comments, {
    commentId: Number(params.commentId),
    visible: params.visible,
  });

  const commentsUrl = `${POST_COMMENTS_ENDPOINT}?targetId=${encodeURIComponent(String(params.targetId))}&targetType=${encodeURIComponent(normalizedTargetType)}`;
  mutate(commentsUrl);

  return res.data;
}
