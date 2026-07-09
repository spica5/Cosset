'use client';

import type { IJourneyCompanion } from 'src/types/journey-diary-location';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Badge from '@mui/material/Badge';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import AvatarGroup from '@mui/material/AvatarGroup';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';

import { getS3SignedUrl } from 'src/utils/helper';

import { RouterLink } from 'src/routes/components';

import { useGetFriends } from 'src/actions/friend';
import { useGetCommunityUsers } from 'src/actions/user';

import { Iconify } from 'src/components/dashboard/iconify';
import { Scrollbar } from 'src/components/dashboard/scrollbar';
import { SearchNotFound } from 'src/components/dashboard/search-not-found';
import { usePopover, CustomPopover } from 'src/components/dashboard/custom-popover';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export function useJourneyCompanionOptions(enabled = true) {
  const { user } = useAuthContext();
  const currentUserId = user?.id ? String(user.id).trim() : '';
  const canLoad = enabled && Boolean(currentUserId);

  const { friends: acceptedRelations, friendsLoading } = useGetFriends(
    currentUserId,
    'accepted',
    canLoad,
  );
  const { users, usersLoading } = useGetCommunityUsers(500, 0, canLoad);

  const companions = useMemo<IJourneyCompanion[]>(() => {
    if (!canLoad) {
      return [];
    }

    const friendIds = new Set(
      acceptedRelations.map((relation) =>
        relation.userId1 === currentUserId ? relation.userId2 : relation.userId1,
      ),
    );

    return users
      .filter((entry) => friendIds.has(String(entry.id)))
      .map((entry) => {
        const fullName = `${entry.firstName || ''} ${entry.lastName || ''}`.trim();

        return {
          id: String(entry.id),
          name: fullName || entry.email || 'Friend',
          email: String(entry.email || ''),
          avatarUrl: String(entry.photoURL || ''),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [acceptedRelations, canLoad, currentUserId, users]);

  return {
    companions,
    companionsLoading: canLoad && (friendsLoading || usersLoading),
  };
}

function CompanionAvatar({
  companion,
  size = 28,
}: {
  companion: IJourneyCompanion;
  size?: number;
}) {
  const [avatarSrc, setAvatarSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    const raw = String(companion.avatarUrl || '').trim();

    if (!raw) {
      setAvatarSrc('');
      return undefined;
    }

    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('/') ||
      raw.startsWith('public:')
    ) {
      setAvatarSrc(raw.startsWith('public:') ? raw.replace(/^public:/, '') : raw);
      return undefined;
    }

    (async () => {
      const url = await getS3SignedUrl(raw);
      if (!cancelled) {
        setAvatarSrc(url || '');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companion.avatarUrl]);

  return (
    <Avatar alt={companion.name} src={avatarSrc || undefined} sx={{ width: size, height: size }}>
      {companion.name.charAt(0).toUpperCase()}
    </Avatar>
  );
}

type PickerProps = {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

export function JourneyCompanionPicker({ value, onChange, disabled }: PickerProps) {
  const { companions, companionsLoading } = useJourneyCompanionOptions(true);
  const [search, setSearch] = useState('');

  const selected = useMemo(
    () => companions.filter((companion) => value.includes(companion.id)),
    [companions, value],
  );

  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      loading={companionsLoading}
      disabled={disabled}
      options={companions}
      value={selected}
      inputValue={search}
      onInputChange={(_event, next) => setSearch(next)}
      onChange={(_event, next) => onChange(next.map((companion) => companion.id))}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, optionValue) => option.id === optionValue.id}
      noOptionsText={<SearchNotFound query={search} />}
      filterOptions={(options, state) => {
        const query = state.inputValue.trim().toLowerCase();

        if (!query) {
          return options;
        }

        return options.filter(
          (option) =>
            option.name.toLowerCase().includes(query) ||
            option.email?.toLowerCase().includes(query),
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="People who accompanied you"
          placeholder={selected.length ? '' : 'Select friends'}
          helperText="Choose friends who traveled with you on this journey."
        />
      )}
      renderOption={(props, companion, { selected: isSelected }) => (
        <li {...props} key={companion.id}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: 1, py: 0.25 }}>
            <Box sx={{ position: 'relative' }}>
              <CompanionAvatar companion={companion} size={32} />
              {isSelected ? (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    bgcolor: 'rgba(0,0,0,0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'common.white',
                  }}
                >
                  <Iconify icon="eva:checkmark-fill" width={16} />
                </Box>
              ) : null}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {companion.name}
              </Typography>
              {companion.email ? (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {companion.email}
                </Typography>
              ) : null}
            </Box>
          </Stack>
        </li>
      )}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((companion, index) => {
          const { key, ...tagProps } = getTagProps({ index });

          return (
            <Chip
              {...tagProps}
              key={key}
              size="small"
              label={companion.name}
              avatar={<CompanionAvatar companion={companion} size={24} />}
            />
          );
        })
      }
    />
  );
}

function useSelectedCompanions(companionIds?: string[] | null) {
  const { companions, companionsLoading } = useJourneyCompanionOptions(true);

  const selected = useMemo(() => {
    const ids = companionIds || [];
    const byId = new Map(
      companions.map((companion) => [companion.id.toLowerCase(), companion]),
    );

    return ids
      .map((id) => byId.get(String(id).toLowerCase()) || { id, name: 'Traveler', avatarUrl: '' })
      .filter(Boolean) as IJourneyCompanion[];
  }, [companionIds, companions]);

  return { selected, companionsLoading };
}

type PanelProps = {
  companionIds?: string[] | null;
  editHref?: string;
};

function JourneyCompanionPopoverContent({ companionIds, editHref }: PanelProps) {
  const { selected, companionsLoading } = useSelectedCompanions(companionIds);

  return (
    <Box sx={{ width: 320, maxWidth: '90vw' }}>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={1}
        sx={{ px: 2, pt: 2, pb: 1 }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            People who accompanied you
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Friends who traveled with you on this journey.
          </Typography>
        </Box>

        {editHref ? (
          <Typography
            component={RouterLink}
            href={editHref}
            variant="caption"
            sx={{
              color: 'primary.main',
              fontWeight: 600,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Edit
          </Typography>
        ) : null}
      </Stack>

      {companionsLoading ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: 3 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading companions...
          </Typography>
        </Stack>
      ) : selected.length ? (
        <Scrollbar sx={{ maxHeight: 280 }}>
          <Stack spacing={0.5} sx={{ px: 1, pb: 1.5 }}>
            {selected.map((companion) => (
              <Stack
                key={companion.id}
                direction="row"
                spacing={1.25}
                alignItems="center"
                sx={{
                  px: 1,
                  py: 1,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <CompanionAvatar companion={companion} size={36} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>
                    {companion.name}
                  </Typography>
                  {companion.email ? (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {companion.email}
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
            ))}
          </Stack>
        </Scrollbar>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
          No companions added yet. Edit a location in Where have you been to tag friends who joined
          this trip.
        </Typography>
      )}
    </Box>
  );
}

export function JourneyCompanionSubtitleTrigger({ companionIds, editHref }: PanelProps) {
  const popover = usePopover();
  const { selected } = useSelectedCompanions(companionIds);
  const hasCompanions = selected.length > 0;

  return (
    <>
      <Tooltip title="People who accompanied you">
        <IconButton
          size="small"
          onClick={popover.onOpen}
          aria-label="People who accompanied you"
          sx={{
            color: INK_COLOR,
            bgcolor: hasCompanions ? 'rgba(255,255,255,0.55)' : 'transparent',
            border: hasCompanions ? '1px solid rgba(31, 42, 68, 0.12)' : 'none',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.72)',
            },
          }}
        >
          <Badge
            color="primary"
            badgeContent={hasCompanions ? selected.length : 0}
            invisible={!hasCompanions}
          >
            <Iconify icon="solar:users-group-rounded-bold" width={18} />
          </Badge>
        </IconButton>
      </Tooltip>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { offset: 12 } }}
      >
        <JourneyCompanionPopoverContent companionIds={companionIds} editHref={editHref} />
      </CustomPopover>
    </>
  );
}

const INK_COLOR = '#1F2A44';

export function JourneyCompanionPanel({ companionIds, editHref }: PanelProps) {
  return (
    <Box
      sx={{
        mb: 2.5,
        p: { xs: 1.5, md: 2 },
        borderRadius: 1.5,
        border: '1px solid rgba(31, 42, 68, 0.16)',
        bgcolor: 'rgba(255, 255, 255, 0.38)',
      }}
    >
      <JourneyCompanionPopoverContent companionIds={companionIds} editHref={editHref} />
    </Box>
  );
}

type DisplayProps = {
  companionIds?: string[] | null;
  max?: number;
  size?: number;
  emptyLabel?: string;
};

export function JourneyCompanionAvatars({
  companionIds,
  max = 4,
  size = 28,
  emptyLabel = '-',
}: DisplayProps) {
  const { companions } = useJourneyCompanionOptions(true);

  const selected = useMemo(() => {
    const ids = companionIds || [];
    const byId = new Map(
      companions.map((companion) => [companion.id.toLowerCase(), companion]),
    );

    return ids
      .map((id) => byId.get(String(id).toLowerCase()) || { id, name: 'Traveler', avatarUrl: '' })
      .filter(Boolean) as IJourneyCompanion[];
  }, [companionIds, companions]);

  if (!selected.length) {
    if (!emptyLabel) {
      return null;
    }

    return (
      <Typography variant="body2" color="text.secondary">
        {emptyLabel}
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
      <AvatarGroup
        max={max}
        sx={{
          '& .MuiAvatar-root': {
            width: size,
            height: size,
            fontSize: size * 0.4,
            borderWidth: 1,
          },
        }}
      >
        {selected.map((companion) => (
          <Tooltip key={companion.id} title={companion.name}>
            <Box component="span" sx={{ display: 'inline-flex' }}>
              <CompanionAvatar companion={companion} size={size} />
            </Box>
          </Tooltip>
        ))}
      </AvatarGroup>

      <Typography variant="caption" color="text.secondary" noWrap>
        {selected.map((companion) => companion.name).join(', ')}
      </Typography>
    </Stack>
  );
}

type NamesProps = {
  companionIds?: string[] | null;
};

export function JourneyCompanionNames({ companionIds }: NamesProps) {
  const { companions } = useJourneyCompanionOptions(Boolean(companionIds?.length));

  const names = useMemo(() => {
    if (!companionIds?.length) {
      return [];
    }

    const byId = new Map(companions.map((companion) => [companion.id, companion.name]));
    return companionIds.map((id) => byId.get(id)).filter(Boolean) as string[];
  }, [companionIds, companions]);

  if (!names.length) {
    return null;
  }

  return (
    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
      With {names.join(', ')}
    </Typography>
  );
}
