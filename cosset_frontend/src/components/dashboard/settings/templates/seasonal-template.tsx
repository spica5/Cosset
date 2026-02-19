import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import COLORS from 'src/theme/dashboard/core/colors.json';
import PRIMARY_COLOR from 'src/theme/dashboard/with-settings/primary-color.json';

import { useSettingsContext } from '../context';
import { SeasonalOptions } from './seasonal-options';

import type { SeasonalTemplateProps } from '../types';

export function SeasonalTemplates({
    sx,
}: SeasonalTemplateProps) {
    const theme = useTheme();

    const settings = useSettingsContext();

    return (
        <Box sx={{ p: 3, bgcolor: theme.palette.background.default, borderRadius: 2, ...sx }}>
            <SeasonalOptions
                value={settings.primaryColor}
                onClickOption={(newValue) => settings.onUpdateField('primaryColor', newValue)}
                options={[
                    { name: 'default', value: COLORS.primary.main },
                    { name: 'blue', value: PRIMARY_COLOR.blue.main },
                    { name: 'orange', value: PRIMARY_COLOR.orange.main },
                    { name: 'red', value: PRIMARY_COLOR.red.main },
                ]}
            />
        </Box>
    );
}