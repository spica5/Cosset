import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';
import { varAlpha, bgGradient } from 'src/theme/dashboard/styles';

// ----------------------------------------------------------------------

const DASHBOARD_BANNER_URL = `${CONFIG.dashboard.assetsDir}/assets/images/dashboard/banner.png`;

type Props = BoxProps & {
  title?: string;
  description?: string;
  img?: React.ReactNode;
  action?: React.ReactNode;
};

export function AppWelcome({ title, description, action, img, sx, ...other }: Props) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        ...bgGradient({
          color: `to right, ${varAlpha(theme.vars.palette.grey['900Channel'], 0.72)} 0%, ${varAlpha(theme.vars.palette.grey['900Channel'], 0.45)} 55%, ${varAlpha(theme.vars.palette.grey['900Channel'], 0.2)} 100%`,
          imgUrl: DASHBOARD_BANNER_URL,
        }),
        pt: 5,
        pb: 5,
        pr: 3,
        gap: 5,
        borderRadius: 2,
        display: 'flex',
        minHeight: { xs: 220, md: 280 },
        height: { md: 1 },
        position: 'relative',
        pl: { xs: 3, md: 5 },
        alignItems: 'center',
        color: 'common.white',
        textAlign: { xs: 'center', md: 'left' },
        flexDirection: { xs: 'column', md: 'row' },
        border: `solid 1px ${theme.vars.palette.grey[800]}`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        ...sx,
      }}
      {...other}
    >
      <Box
        sx={{
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          alignItems: { xs: 'center', md: 'flex-start' },
        }}
      >
        <Typography variant="h4" sx={{ whiteSpace: 'pre-line', mb: 1 }}>
          {title}
        </Typography>

        <Typography
          variant="body2"
          sx={{ opacity: 0.84, maxWidth: 520, ...(action && { mb: 3 }) }}
        >
          {description}
        </Typography>

        {action && action}
      </Box>

      {img && <Box sx={{ maxWidth: 260 }}>{img}</Box>}
    </Box>
  );
}
