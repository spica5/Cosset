export type IBookshelfIntroduce = {
  id: number;
  title: string;
  author?: string | null;
  description?: string | null;
  coverImage?: string | null;
  fileUrl: string;
  order?: number | null;
  createdAt?: string | Date | null;
};
