import type { CardProps } from '@mui/material/Card';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';

import { SeasonalTemplates } from 'src/components/dashboard/settings';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
};

export function AppSeasonalTemplate({ title, subheader, ...other }: Props) {
  return (
    <Card {...other}>
      <CardHeader
        title={title}
        subheader={subheader}
        sx={{ mb: 3 }}
      />
        <SeasonalTemplates />
    </Card>
  );
}
