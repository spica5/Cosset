import type { StackProps } from '@mui/material/Stack';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/dashboard/iconify';
import { usePopover, CustomPopover } from 'src/components/dashboard/custom-popover';

// ----------------------------------------------------------------------

type Props = StackProps & {
  backLink: string;
  editLink: string;
  openness: string;
  onChangeOpenness: (newValue: string) => void;
  opennessOptions: {
    value: string;
    label: string;
  }[];
};

export function AlbumDetailsToolbar({
  openness,
  backLink,
  editLink,
  opennessOptions,
  onChangeOpenness,
  sx,
  ...other
}: Props) {
  const popover = usePopover();

  return (
    <>
      <Stack spacing={1.5} direction="row" sx={{ mb: { xs: 3, md: 5 }, ...sx }} {...other}>
        <Button
          component={RouterLink}
          href={backLink}
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={16} />}
        >
          Back
        </Button>

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title="Edit">
          <IconButton component={RouterLink} href={editLink}>
            <Iconify icon="solar:pen-bold" />
          </IconButton>
        </Tooltip>

        <LoadingButton
          color="inherit"
          variant="contained"
          loading={!openness}
          loadingIndicator="Loading…"
          endIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
          onClick={popover.onOpen}
          sx={{ textTransform: 'capitalize' }}
        >
          {openness}
        </LoadingButton>
      </Stack>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'top-right' } }}
      >
        <MenuList>
          {opennessOptions.map((option) => (
            <MenuItem
              key={option.value}
              selected={option.value === openness}
              onClick={() => {
                popover.onClose();
                onChangeOpenness(option.value);
              }}
            >
              {option.value === 'Public' && <Iconify icon="solar:heart-unlock-bold" />}
              {option.value === 'Private' && <Iconify icon="solar:heart-lock-bold" />}
              {option.label}
            </MenuItem>
          ))}
        </MenuList>
      </CustomPopover>
    </>
  );
}
