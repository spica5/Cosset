'use client';

import type { WebsiteTestingDisclosureContentData } from 'src/content/website-testing-disclosure';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import {
  DEFAULT_WEBSITE_TESTING_DISCLOSURE,
} from 'src/content/website-testing-disclosure';

// ----------------------------------------------------------------------

type Props = {
  compact?: boolean;
  content?: WebsiteTestingDisclosureContentData | null;
  showUpdatedAt?: boolean;
};

function formatUpdatedAt(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString();
}

export function WebsiteTestingDisclosureContent({
  compact = false,
  content,
  showUpdatedAt = false,
}: Props) {
  const data = content || DEFAULT_WEBSITE_TESTING_DISCLOSURE;
  const updatedLabel = formatUpdatedAt(data.updatedAt);

  return (
    <Stack spacing={compact ? 2 : 2.5}>
      <Box>
        <Typography variant={compact ? 'h6' : 'h5'} sx={{ fontWeight: 700, mb: 1 }}>
          {data.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {data.intro}
        </Typography>
        {showUpdatedAt && updatedLabel ? (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
            Last updated: {updatedLabel}
          </Typography>
        ) : null}
      </Box>

      {data.sections.map((section) => (
        <Stack key={section.title} spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {section.title}
          </Typography>

          {section.paragraphs.map((paragraph) => (
            <Typography key={paragraph} variant="body2" color="text.secondary">
              {paragraph}
            </Typography>
          ))}

          {section.bullets?.length ? (
            <Box
              component="ul"
              sx={{
                m: 0,
                pl: 2.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
              }}
            >
              {section.bullets.map((bullet) => (
                <Typography
                  key={bullet}
                  component="li"
                  variant="body2"
                  color="text.secondary"
                  sx={{ display: 'list-item' }}
                >
                  {bullet}
                </Typography>
              ))}
            </Box>
          ) : null}
        </Stack>
      ))}
    </Stack>
  );
}
