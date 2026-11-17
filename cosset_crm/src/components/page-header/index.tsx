'use client';

import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';

import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

export type PageHeaderLink = {
  name?: string;
  href?: string;
};

export type CustomBreadcrumbsProps = BoxProps & {
  heading?: string;
  links?: PageHeaderLink[];
  action?: React.ReactNode;
};

export function CustomBreadcrumbs({
  heading,
  links = [],
  action,
  sx,
  ...other
}: CustomBreadcrumbsProps) {
  return (
    <Box sx={[{ mb: { xs: 2, md: 3 } }, ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          mb: heading || links.length ? 1 : 0,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {heading ? (
            <Typography variant="h4" sx={{ mb: links.length ? 1 : 0 }}>
              {heading}
            </Typography>
          ) : null}

          {links.length ? (
            <Breadcrumbs>
              {links.map((link, index) => {
                const isLast = index === links.length - 1;
                if (!link.href || isLast) {
                  return (
                    <Typography key={`${link.name}-${index}`} color="text.primary">
                      {link.name}
                    </Typography>
                  );
                }

                return (
                  <Link
                    key={`${link.name}-${index}`}
                    component={RouterLink}
                    href={link.href}
                    color="inherit"
                    underline="hover"
                  >
                    {link.name}
                  </Link>
                );
              })}
            </Breadcrumbs>
          ) : null}
        </Box>

        {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
      </Box>
    </Box>
  );
}
