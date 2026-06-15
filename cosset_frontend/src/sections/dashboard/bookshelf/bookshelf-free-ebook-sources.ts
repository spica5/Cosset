export type FreeEbookSource = {
  name: string;
  description: string;
  href: string;
};

export const FREE_EBOOK_SOURCES: FreeEbookSource[] = [
  {
    name: 'Project Gutenberg',
    description: 'A large library of public-domain books you can read online or download for free.',
    href: 'https://www.gutenberg.org',
  },
  {
    name: 'Open Library',
    description: 'Browse millions of books, including many that can be borrowed or read for free.',
    href: 'https://openlibrary.org',
  },
  {
    name: 'Internet Archive',
    description: 'Access scanned books, texts, and other reading materials at no cost.',
    href: 'https://archive.org/details/texts',
  },
  {
    name: 'Standard Ebooks',
    description: 'Carefully produced, free editions of public-domain books in modern formats.',
    href: 'https://standardebooks.org',
  },
  {
    name: 'ManyBooks',
    description: 'Discover free ebooks across genres, available in several download formats.',
    href: 'https://manybooks.net',
  },
];
