'use client';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import { BOOK_GENRE_OPTIONS, type BookshelfShelfTab } from './bookshelf-book-categories';
import { BOOKSHELF_SORT_OPTIONS, type BookshelfSortValue } from './bookshelf-sort';

// ----------------------------------------------------------------------

type Props = {
  tab: BookshelfShelfTab;
  genre: string;
  sortBy: BookshelfSortValue;
  borrowedCount?: number;
  favoriteCount?: number;
  onTabChange: (tab: BookshelfShelfTab) => void;
  onGenreChange: (genre: string) => void;
  onSortChange: (sortBy: BookshelfSortValue) => void;
};

export function BookshelfShelfFilters({
  tab,
  genre,
  sortBy,
  borrowedCount = 0,
  favoriteCount = 0,
  onTabChange,
  onGenreChange,
  onSortChange,
}: Props) {
  const favoriteLabel = favoriteCount > 0 ? `Favorite (${favoriteCount})` : 'Favorite';
  const borrowedLabel = borrowedCount > 0 ? `Borrowed (${borrowedCount})` : 'Borrowed';

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      alignItems={{ md: 'center' }}
      justifyContent="space-between"
      sx={{ mt: 2 }}
    >
      <Tabs
        value={tab}
        onChange={(_, value: BookshelfShelfTab) => onTabChange(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ minHeight: 40 }}
      >
        <Tab value="all" label="All" sx={{ minHeight: 40 }} />
        <Tab value="favorite" label={favoriteLabel} sx={{ minHeight: 40 }} />
        <Tab value="borrowed" label={borrowedLabel} sx={{ minHeight: 40 }} />
      </Tabs>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ width: { xs: 1, md: 'auto' }, minWidth: { md: 420 } }}
      >
        <TextField
          select
          size="small"
          label="Category"
          value={genre}
          onChange={(event) => onGenreChange(event.target.value)}
          sx={{ minWidth: { sm: 200 }, flex: 1 }}
          SelectProps={{
            MenuProps: {
              PaperProps: {
                sx: { maxHeight: 320 },
              },
            },
          }}
        >
          <MenuItem value="">All categories</MenuItem>
          {BOOK_GENRE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Sort by"
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value as BookshelfSortValue)}
          sx={{ minWidth: { sm: 180 }, flex: 1 }}
        >
          {BOOKSHELF_SORT_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Stack>
  );
}
