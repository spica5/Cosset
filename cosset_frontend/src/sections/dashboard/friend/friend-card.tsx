import type { IFriendCard } from 'src/types/friend';
import type { CardProps } from '@mui/material/Card';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fShortenNumber } from 'src/utils/format-number';
import { getS3SignedUrl } from 'src/utils/helper';

import { _moodIcons } from 'src/_mock/assets';
import { getMoodDisplayIcon } from 'src/utils/mood-templates';

import { varAlpha } from 'src/theme/dashboard/styles';
import { AvatarShape } from 'src/assets/dashboard/illustrations';

import { Image } from 'src/components/dashboard/image';
import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const _motifAvatars: Record<string, string> = {
  'Welcome guests': '👋',
  'Be Away': '🚪',
  'Be back soon.': '⏳',
};

const getMotifAvatar = (motif?: string) => {
  if (!motif) return '✨';
  return _motifAvatars[motif] || '✨';
};

const getMoodAvatar = (mood?: string) => {
  if (!mood) return '😊';
  return _moodIcons[mood] || getMoodDisplayIcon(mood);
};

// ----------------------------------------------------------------------

type Props = CardProps & {
  friend: IFriendCard;
  onAccept?: () => void | Promise<void>;
  onReject?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  onRemove?: () => void | Promise<void>;
  actionLoading?: boolean;
};

export function FriendCard({
  friend,
  onAccept,
  onReject,
  onCancel,
  onRemove,
  actionLoading = false,
  sx,
  ...other
}: Props) {
  const { user } = useAuthContext();
  const isCurrentUser = user?.id === friend.id;
  const motifLabel = friend.motif || 'No guest area motif';
  const moodLabel = friend.mood || 'No guest area mood';

  const [signedAvatarUrl, setSignedAvatarUrl] = useState('');
  const [signedCoverUrl, setSignedCoverUrl] = useState('');
  const [openAvatarPreview, setOpenAvatarPreview] = useState(false);
  const [openRemoveConfirm, setOpenRemoveConfirm] = useState(false);

  useEffect(() => {
    let mounted = true;

    const resolveAvatarUrl = async () => {
      const avatarKey = friend.avatarUrl;

      if (!avatarKey) {
        if (mounted) setSignedAvatarUrl('');
        return;
      }

      if (avatarKey.startsWith('http://') || avatarKey.startsWith('https://')) {
        if (mounted) setSignedAvatarUrl(avatarKey);
        return;
      }

      const signedUrl = await getS3SignedUrl(avatarKey);
      if (mounted) {
        setSignedAvatarUrl(signedUrl || '');
      }
    };

    resolveAvatarUrl();

    return () => {
      mounted = false;
    };
  }, [friend.avatarUrl]);

  useEffect(() => {
    let mounted = true;

    const resolveCoverUrl = async () => {
      const coverKey = friend.coverUrl;

      if (!coverKey) {
        if (mounted) setSignedCoverUrl('');
        return;
      }

      if (
        coverKey.startsWith('http://') ||
        coverKey.startsWith('https://') ||
        coverKey.startsWith('/')
      ) {
        if (mounted) setSignedCoverUrl(coverKey);
        return;
      }

      const signedUrl = await getS3SignedUrl(coverKey);
      if (mounted) {
        setSignedCoverUrl(signedUrl || '');
      }
    };

    resolveCoverUrl();

    return () => {
      mounted = false;
    };
  }, [friend.coverUrl]);

  return (
    <Card sx={{ textAlign: 'center', ...sx }} {...other}>
      <Link component={RouterLink} href={paths.universe.view(friend.id)} color="inherit" target="_blank" rel="noopener noreferrer">
        <Box sx={{ position: 'relative' }}>
          <AvatarShape
            sx={{
              left: 0,
              right: 0,
              zIndex: 10,
              mx: 'auto',
              bottom: -26,
              position: 'absolute',
            }}
          />

          <Avatar
            alt={friend.name}
            src={signedAvatarUrl || undefined}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (signedAvatarUrl) {
                setOpenAvatarPreview(true);
              }
            }}
            sx={{
              width: 64,
              height: 64,
              zIndex: 11,
              left: 0,
              right: 0,
              bottom: -32,
              mx: 'auto',
              position: 'absolute',
              cursor: signedAvatarUrl ? 'zoom-in' : 'default',
            }}
          />

          <Image
            src={signedCoverUrl}
            alt={friend.name}
            ratio="16/9"
            slotProps={{
              overlay: {
                bgcolor: (theme) => varAlpha(theme.vars.palette.common.blackChannel, 0.48),
              },
            }}
          />
        </Box>
      </Link>

      <ListItemText
        sx={{ mt: 5, mb: 1 }}
        primary={friend.universeName || 'No guest area title'}
        secondary={
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <Avatar sx={{ width: 20, height: 20, fontSize: 12 }}>
              {getMotifAvatar(friend.motif)}
            </Avatar>
            <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
              {motifLabel}
            </Typography>
          </Box>
        }
        primaryTypographyProps={{ typography: 'subtitle1' }}
        secondaryTypographyProps={{ component: 'span' }}
      />

      <ListItemText
        sx={{ mt: 1, mb: 1 }}
        primary={
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
            <Typography component="span" variant="body2" noWrap>
              {friend.name}
            </Typography>
            {isCurrentUser && <Chip label="You" size="small" color="primary" variant="filled" />}
          </Box>
        }
        secondary={friend.email || friend.motif}
        primaryTypographyProps={{
          noWrap: true,
          component: 'span',
          color: 'text.primary',
          typography: 'body2',
        }}
        secondaryTypographyProps={{ component: 'span', mt: 0.5 }}
      />

      {friend.relationStatus === 'pending' ? (
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }}>
            {friend.requestMessage || 'Friend request pending'}
          </Typography>

          <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'center' }}>
            {friend.pendingDirection === 'incoming' ? (
              <>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  disabled={actionLoading}
                  onClick={(event) => {
                    event.stopPropagation();
                    onAccept?.();
                  }}
                >
                  Accept
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  disabled={actionLoading}
                  onClick={(event) => {
                    event.stopPropagation();
                    onReject?.();
                  }}
                >
                  Reject
                </Button>
              </>
            ) : (
              <Button
                size="small"
                variant="outlined"
                color="warning"
                disabled={actionLoading}
                onClick={(event) => {
                  event.stopPropagation();
                  onCancel?.();
                }}
              >
                Cancel Request
              </Button>
            )}
          </Box>
        </Box>
      ) : null}

      {friend.relationStatus === 'accepted' && !isCurrentUser ? (
        <Box sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'center' }}>
          <Button
            size="small"
            variant="outlined"
            color="error"
            sx={{ width: '50%' }}
            disabled={actionLoading}
            onClick={(event) => {
              event.stopPropagation();
              setOpenRemoveConfirm(true);
            }}
          >
            Remove Friend
          </Button>
        </Box>
      ) : null}

      <Dialog
        open={openRemoveConfirm}
        onClose={() => setOpenRemoveConfirm(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Remove Friend</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to remove <strong>{friend.name}</strong> from your friends?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRemoveConfirm(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={actionLoading}
            onClick={() => {
              setOpenRemoveConfirm(false);
              onRemove?.();
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Box
        display="grid"
        gridTemplateColumns="repeat(3, 1fr)"
        sx={{ py: 3, typography: 'subtitle1' }}
      >
        <div>
          <Typography variant="caption" component="div" sx={{ mb: 0.5, color: 'text.secondary' }}>
            Mood
          </Typography>
          <Tooltip title={moodLabel} arrow>
            <Avatar sx={{ width: 24, height: 24, fontSize: 14, mx: 'auto', cursor: 'help' }}>
              {getMoodAvatar(friend.mood)}
            </Avatar>
          </Tooltip>
        </div>

        <div>
          <Typography variant="caption" component="div" sx={{ mb: 0.5, color: 'text.secondary' }}>
            Friends
          </Typography>

          {fShortenNumber(friend.connections)}
        </div>

        <div>
          <Typography variant="caption" component="div" sx={{ mb: 0.5, color: 'text.secondary' }}>
            Openness
          </Typography>
          {friend.openness}
        </div>
      </Box>

      <Dialog
        open={openAvatarPreview}
        onClose={() => setOpenAvatarPreview(false)}
        maxWidth={false}
        PaperProps={{ sx: { position: 'relative', bgcolor: 'common.black' } }}
      >
        <IconButton
          onClick={() => setOpenAvatarPreview(false)}
          sx={{
            top: 8,
            right: 8,
            zIndex: 2,
            position: 'absolute',
            color: 'common.white',
            bgcolor: 'rgba(0,0,0,0.45)',
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <DialogContent sx={{ p: 1.5 }}>
          <Box
            component="img"
            src={signedAvatarUrl}
            alt={friend.name}
            sx={{
              width: 'auto',
              height: 'auto',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'block',
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
