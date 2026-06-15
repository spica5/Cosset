export type IBookshelfIntroduce = {
  id: number;
  title: string;
  description?: string | null;
  coverImage?: string | null;
  fileUrl: string;
  order?: number | null;
  createdAt?: string | Date | null;
};
