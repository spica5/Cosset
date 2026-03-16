import type { UseSetStateReturn } from 'src/hooks/use-set-state';

import parse from 'autosuggest-highlight/parse';
import match from 'autosuggest-highlight/match';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import Autocomplete, { autocompleteClasses } from '@mui/material/Autocomplete';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/dashboard/iconify';
import { SearchNotFound } from 'src/components/dashboard/search-not-found';

// ----------------------------------------------------------------------

type SearchOption = {
  id: string | number;
  name?: string | null;
  title?: string | null;
};

type SearchState<T extends SearchOption> = {
  query: string;
  results: T[];
};

type Props<T extends SearchOption> = {
  placeholder?: string;
  onSearch: (inputValue: string) => void;
  onSelect?: (option: T) => void;
  search: UseSetStateReturn<SearchState<T>>;
};

const getOptionText = <T extends SearchOption>(option: T) => {
  const name = (option.name || '').trim();
  const title = (option.title || '').trim();

  if (name) {
    return name;
  }

  if (title) {
    return title;
  }

  return `Item ${option.id}`;
};

export function CollectionItemsSearch<T extends SearchOption>({
  search,
  onSearch,
  onSelect,
  placeholder,
}: Props<T>) {
  const router = useRouter();

  const { state } = search;

  const handleClick = (option: T) => {
    if (onSelect) {
      onSelect(option);
      return;
    }

    router.push(paths.dashboard.collections.items(option.id));
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (state.query && event.key === 'Enter') {
      const normalizedQuery = state.query.toLowerCase();
      const selectedCollection = state.results.find(
        (collection) => getOptionText(collection).toLowerCase() === normalizedQuery,
      );

      if (selectedCollection) {
        handleClick(selectedCollection);
      }
    }
  };

  return (
    <Autocomplete
      sx={{ width: { xs: 100, sm: 400 } }}
      autoHighlight
      popupIcon={null}
      options={state.results}
      onInputChange={(event, newValue) => onSearch(newValue)}
      getOptionLabel={(option) => getOptionText(option)}
      noOptionsText={<SearchNotFound query={state.query} />}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      slotProps={{
        popper: { placement: 'bottom-start', sx: { minWidth: 400 } },
        paper: { sx: { [` .${autocompleteClasses.option}`]: { pl: 0.75 } } },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder || 'Search collections...'}
          onKeyUp={handleKeyUp}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ ml: 1, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
      )}
      renderOption={(props, option, { inputValue }) => {
        const label = getOptionText(option);
        const matches = match(label, inputValue);
        const parts = parse(label, matches);

        return (
          <Box
            component="li"
            {...props}
            onClick={() => handleClick(option)}
            key={option.id}
          >
            <Avatar
              alt={label}
              sx={{
                mr: 1.5,
                width: 40,
                height: 40,
                flexShrink: 0,
                bgcolor: 'primary.main',
              }}
            >
              {label.charAt(0).toUpperCase()}
            </Avatar>

            <div key={inputValue}>
              {parts.map((part, index) => (
                <Typography
                  key={index}
                  component="span"
                  color={part.highlight ? 'primary' : 'textPrimary'}
                  sx={{
                    typography: 'body2',
                    fontWeight: part.highlight ? 'fontWeightSemiBold' : 'fontWeightMedium',
                  }}
                >
                  {part.text}
                </Typography>
              ))}
            </div>
          </Box>
        );
      }}
    />
  );
}
