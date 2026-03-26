import type { IBlogItem } from 'src/types/blog';
import type { IPostCommentItem } from 'src/types/post';

import useSWR, { mutate } from 'swr';
import { useMemo, useCallback } from 'react';

import axios, { fetcher, endpoints } from 'src/utils/axios';
import { addPostComment, useGetPostComments } from 'src/actions/post';

// ----------------------------------------------------------------------

const BLOG_LIST_ENDPOINT = endpoints.blog.list;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

type BlogsData = {
  blogs?: IBlogItem[];
};

export function useGetBlogs(customerId?: string | number) {
  const url = customerId
    ? `${BLOG_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(customerId))}`
    : BLOG_LIST_ENDPOINT;

  const { data, isLoading, error, isValidating } = useSWR<BlogsData>(url, fetcher, swrOptions);
  const refreshBlogs = useCallback(() => mutate(url), [url]);

  const memoizedValue = useMemo(() => {
    const blogs = data?.blogs || [];

    return {
      blogs,
      blogsLoading: isLoading,
      blogsError: error,
      blogsValidating: isValidating,
      blogsEmpty: !isLoading && !blogs.length,
      refreshBlogs,
    };
  }, [data?.blogs, error, isLoading, isValidating, refreshBlogs]);

  return memoizedValue;
}

// ----------------------------------------------------------------------

type BlogData = {
  blog?: IBlogItem;
};

type ViewedBlogsData = {
  viewedBlogIds?: number[];
};

export function useGetBlog(blogId: string | number | '') {
  const url = blogId ? `${endpoints.blog.details}?id=${encodeURIComponent(String(blogId))}` : null;

  const { data, isLoading, error, isValidating } = useSWR<BlogData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      blog: data?.blog, 
      blogLoading: isLoading,
      blogError: error,
      blogValidating: isValidating,
    }),
    [data?.blog, error, isLoading, isValidating],
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetViewedBlogIds(ownerCustomerId?: string | number) {
  const url = ownerCustomerId
    ? `${endpoints.blog.view}?ownerCustomerId=${encodeURIComponent(String(ownerCustomerId))}`
    : endpoints.blog.view;

  const { data, isLoading, error, isValidating } = useSWR<ViewedBlogsData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      viewedBlogIds: data?.viewedBlogIds || [],
      viewedBlogIdsLoading: isLoading,
      viewedBlogIdsError: error,
      viewedBlogIdsValidating: isValidating,
    }),
    [data?.viewedBlogIds, error, isLoading, isValidating],
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export async function createBlog(blog: Omit<IBlogItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const data = { blog };
  const res = await axios.post(endpoints.blog.add, data);

  // Revalidate the blog list cache after creating a blog.
  mutate(BLOG_LIST_ENDPOINT);
  if (blog.customerId) {
    mutate(`${BLOG_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(blog.customerId))}`);
  }

  return res.data;
}

// ----------------------------------------------------------------------

export async function updateBlog(
  blogId: string | number,
  updates: Partial<Omit<IBlogItem, 'id' | 'createdAt' | 'updatedAt'>>,
) {
  const data = { blog: updates };
  const res = await axios.put(endpoints.blog.update(blogId), data);

  mutate(BLOG_LIST_ENDPOINT);
  if (updates.customerId) {
    mutate(`${BLOG_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(updates.customerId))}`);
  }
  mutate(`${endpoints.blog.details}?id=${encodeURIComponent(String(blogId))}`);

  return res.data;
}

// ----------------------------------------------------------------------

export async function deleteBlog(
  blogId: string | number,
  customerId?: string | number,
) {
  const res = await axios.delete(endpoints.blog.delete(blogId));

  mutate(BLOG_LIST_ENDPOINT);
  if (customerId) {
    mutate(`${BLOG_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(customerId))}`);
  }

  return res.data;
}

// ----------------------------------------------------------------------

/**
 * Record a blog view.
 * The backend increments total_views only when this customer has not viewed it before.
 */
export async function recordBlogView(blogId: string | number): Promise<void> {
  try {
    await axios.post(endpoints.blog.view, { blogId: Number(blogId) });

    // Revalidate the blog detail cache so totalViews reflects the new count.
    mutate(`${endpoints.blog.details}?id=${encodeURIComponent(String(blogId))}`);

    // Revalidate viewed-id caches that feed the landing page viewed/unread counters.
    await mutate((key) => typeof key === 'string' && key.startsWith(endpoints.blog.view));
  } catch {
    // Silently ignore view-count errors — they should not block the page.
  }
}

// ----------------------------------------------------------------------

export function useGetBlogComments(blogId: string | number | '') {
  const {
    comments,
    commentsLoading,
    commentsError,
    commentsValidating,
    commentsEmpty,
    refreshComments,
  } = useGetPostComments(blogId, 'blog');

  return {
    comments: comments as IPostCommentItem[],
    commentsLoading,
    commentsError,
    commentsValidating,
    commentsEmpty,
    refreshComments,
  };
}

export async function addBlogComment(params: {
  blogId: string | number;
  comment: string;
  customerId?: string | number | null;
  prevCustomer?: string | null;
}) {
  return addPostComment({
    targetId: params.blogId,
    targetType: 'blog',
    comment: params.comment,
    customerId: params.customerId,
    prevCustomer: params.prevCustomer,
  });
}
