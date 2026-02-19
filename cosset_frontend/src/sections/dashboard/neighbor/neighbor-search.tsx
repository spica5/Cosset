import type { INeighborItem } from 'src/types/neighbor';
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

type Props = {
  onSearch: (inputValue: string) => void;
  search: UseSetStateReturn<{
    query: string;
    results: INeighborItem[];
  }>;
};

export function NeighborSearch({ search, onSearch }: Props) {
  const router = useRouter();

  const { state } = search;

  const handleClick = (id: string) => {
    router.push(paths.dashboard.community.neighbor.details(id));
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (state.query) {
      if (event.key === 'Enter') {
        const selectProduct = state.results.filter((neighbor) => neighbor.name === state.query)[0];

        handleClick(selectProduct.id);
      }
    }
  };

  return (
    <Autocomplete
      sx={{ width: { xs: 1, sm: 260 } }}
      autoHighlight
      popupIcon={null}
      options={state.results}
      onInputChange={(event, newValue) => onSearch(newValue)}
      getOptionLabel={(option) => option.name}
      noOptionsText={<SearchNotFound query={state.query} />}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      slotProps={{
        popper: { placement: 'bottom-start', sx: { minWidth: 320 } },
        paper: { sx: { [` .${autocompleteClasses.option}`]: { pl: 0.75 } } },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search..."
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
      renderOption={(props, neighbor, { inputValue }) => {
        const matches = match(neighbor.name, inputValue);
        const parts = parse(neighbor.name, matches);

        return (
          <Box component="li" {...props} onClick={() => handleClick(neighbor.id)} key={neighbor.id}>
            <Avatar
              key={neighbor.id}
              alt={neighbor.name}
              src={neighbor.images[0]}
              variant="rounded"
              sx={{
                mr: 1.5,
                width: 48,
                height: 48,
                flexShrink: 0,
                borderRadius: 1,
              }}
            />

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
