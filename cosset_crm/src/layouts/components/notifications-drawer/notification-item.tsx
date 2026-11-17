'use client';

import type { CrmNotificationItem } from 'src/actions/notification';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fToNow } from 'src/utils/format-time';
import { getS3SignedUrl } from 'src/utils/helper';

import { Iconify } from 'src/components/iconify';

import { notificationIcons } from './icons';

// ----------------------------------------------------------------------

export type NotificationItemProps = {
  notification: CrmNotificationItem;
  onRead?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
};

const readerContent = (data: string) => (
  <Box
    dangerouslySetInnerHTML={{ __html: data }}
    sx={{
      '& p': { m: 0, typography: 'body2' },
      '& a': { color: 'inherit', textDecoration: 'none' },
      '& strong': { typography: 'subtitle2' },
    }}
  />
);

export function NotificationItem({ notification, onRead, onArchive, onDelete }: NotificationItemProps) {
  const router = useRouter();
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState('');

  useEffect(() => {
    let mounted = true;

    const resolveAvatarUrl = async () => {
      const avatarKey = String(notification.avatarUrl || '').trim();

      if (!avatarKey) {
        if (mounted) setResolvedAvatarUrl('');
        return;
      }

      if (
        avatarKey.startsWith('http://') ||
        avatarKey.startsWith('https://') ||
        avatarKey.startsWith('/') ||
        avatarKey.startsWith('public:')
      ) {
        if (mounted) {
          setResolvedAvatarUrl(avatarKey.replace(/^public:/, ''));
        }
        return;
      }

      try {
        const signedUrl = await getS3SignedUrl(avatarKey);
        if (mounted) setResolvedAvatarUrl(signedUrl || '');
      } catch {
        if (mounted) setResolvedAvatarUrl('');
      }
    };

    resolveAvatarUrl();

    return () => {
      mounted = false;
    };
  }, [notification.avatarUrl]);

  const handleOpen = () => {
    onRead?.(notification.id);

    if (notification.type === 'payment') {
      router.push(paths.payment.root);
      return;
    }

    router.push(paths.customer.root);
  };

  const renderAvatar = () => (
    <ListItemAvatar>
      {resolvedAvatarUrl ? (
        <Avatar src={resolvedAvatarUrl} sx={{ bgcolor: 'background.neutral' }} />
      ) : (
        <Box
          sx={{
            width: 40,
            height: 40,
            display: 'flex',
            borderRadius: '50%',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.neutral',
          }}
        >
          {notification.type === 'payment' ? notificationIcons.order : notificationIcons.mail}
        </Box>
      )}
    </ListItemAvatar>
  );

  const renderText = () => (
    <ListItemText
      primary={readerContent(notification.title)}
      secondary={
        <>
          {fToNow(notification.createdAt)}
          <Box
            component="span"
            sx={{ width: 2, height: 2, borderRadius: '50%', bgcolor: 'currentColor' }}
          />
          {notification.category}
        </>
      }
      slotProps={{
        primary: { sx: { mb: 0.5 } },
        secondary: {
          sx: {
            gap: 0.5,
            display: 'flex',
            alignItems: 'center',
            typography: 'caption',
            color: 'text.disabled',
          },
        },
      }}
    />
  );

  const renderUnReadBadge = () =>
    notification.isUnRead ? (
      <Box
        sx={{
          top: 26,
          width: 8,
          height: 8,
          right: 20,
          borderRadius: '50%',
          bgcolor: 'info.main',
          position: 'absolute',
        }}
      />
    ) : null;

  const renderActions = () => {
    if (notification.type === 'payment') {
      return (
        <Box sx={{ gap: 1, mt: 1.5, display: 'flex' }}>
          <Button
            size="small"
            variant="contained"
            onClick={(event) => {
              event.stopPropagation();
              handleOpen();
            }}
          >
            View payment
          </Button>
          {!notification.archived ? (
            <Button
              size="small"
              variant="outlined"
              onClick={(event) => {
                event.stopPropagation();
                onArchive?.(notification.id);
              }}
            >
              Archive
            </Button>
          ) : null}
        </Box>
      );
    }

    return (
      <Box sx={{ gap: 1, mt: 1.5, display: 'flex' }}>
        <Button
          size="small"
          variant="contained"
          onClick={(event) => {
            event.stopPropagation();
            handleOpen();
          }}
        >
          View customer
        </Button>
        {!notification.archived ? (
          <Button
            size="small"
            variant="outlined"
            onClick={(event) => {
              event.stopPropagation();
              onArchive?.(notification.id);
            }}
          >
            Archive
          </Button>
        ) : null}
      </Box>
    );
  };

  return (
    <ListItemButton
      disableRipple
      onClick={handleOpen}
      sx={[
        (theme) => ({
          p: 2.5,
          alignItems: 'flex-start',
          borderBottom: `dashed 1px ${theme.vars.palette.divider}`,
        }),
      ]}
    >
      {renderUnReadBadge()}
      {renderAvatar()}

      <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
        {renderText()}
        {renderActions()}
      </Box>

      <IconButton
        size="small"
        color="error"
        onClick={(event) => {
          event.stopPropagation();
          onDelete?.(notification.id);
        }}
        sx={{ ml: 0.5, mt: 0.25 }}
      >
        <Iconify icon="solar:trash-bin-trash-bold" width={16} />
      </IconButton>
    </ListItemButton>
  );
}
