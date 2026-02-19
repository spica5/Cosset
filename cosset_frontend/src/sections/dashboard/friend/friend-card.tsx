import type { IFriendCard } from 'src/types/friend';
import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fShortenNumber } from 'src/utils/format-number';

import { varAlpha } from 'src/theme/dashboard/styles';
import { AvatarShape } from 'src/assets/dashboard/illustrations';

import { Image } from 'src/components/dashboard/image';

// ----------------------------------------------------------------------

type Props = CardProps & {
  friend: IFriendCard;
};

export function FriendCard({ friend, sx, ...other }: Props) {
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
            src={friend.avatarUrl}
            sx={{
              width: 64,
              height: 64,
              zIndex: 11,
              left: 0,
              right: 0,
              bottom: -32,
              mx: 'auto',
              position: 'absolute',
            }}
          />

          <Image
            src={friend.coverUrl}
            alt={friend.coverUrl}
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
        sx={{ mt: 7, mb: 1 }}
        primary={friend.name}
        secondary={friend.motif}
        primaryTypographyProps={{ typography: 'subtitle1' }}
        secondaryTypographyProps={{ component: 'span', mt: 0.5 }}
      />

      <ListItemText
        sx={{ mt: 1, mb: 1 }}
        primary={
          friend.universeName
        }
        secondary={friend.mood}
        primaryTypographyProps={{
          mt: 1,
          noWrap: true,
          component: 'span',
          color: 'text.primary',
          typography: 'subtitle1',
        }}
        secondaryTypographyProps={{ component: 'span', mt: 0.5 }}
      />

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Box
        display="grid"
        gridTemplateColumns="repeat(3, 1fr)"
        sx={{ py: 3, typography: 'subtitle1' }}
      >
        <div>
          <Typography variant="caption" component="div" sx={{ mb: 0.5, color: 'text.secondary' }}>
            Reviews
          </Typography>
          {fShortenNumber(friend.ratingNumber)}
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
    </Card>
  );
}
