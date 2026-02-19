import { Box, Grid } from '@mui/material';
import { useTheme, useColorScheme } from '@mui/material/styles';

import { defaultFont } from 'src/theme/dashboard/core/typography';

import { FontOptions } from './font-options';
import { useSettingsContext } from '../context';
import { BaseOption } from '../drawer/base-option';

import type { GeneralTemplateProps } from '../types';

export function GeneralTemplates({
    sx,
}: GeneralTemplateProps) {
    const theme = useTheme();

    const settings = useSettingsContext();

    const { mode, setMode } = useColorScheme();

    return (
        <Box sx={{ p: 3, bgcolor: theme.palette.background.default, borderRadius: 2, ...sx }}>
            <Grid container display="flex" flexDirection="row" alignItems="center" spacing={2}>
                <Grid item xs={6} md={3}>
                    <Box display="flex" flexDirection="column">
                        <BaseOption
                            label="Dark mode"
                            icon="moon"
                            selected={settings.colorScheme === 'dark'}
                            onClick={() => {
                            settings.onUpdateField('colorScheme', mode === 'light' ? 'dark' : 'light');
                            setMode(mode === 'light' ? 'dark' : 'light');
                            }}
                        />
                    </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Box display="flex" flexDirection="column">
                        <BaseOption
                            label="Contrast"
                            icon="contrast"
                            selected={settings.contrast === 'hight'}
                            onClick={() =>
                                settings.onUpdateField('contrast', settings.contrast === 'default' ? 'hight' : 'default')
                            }
                        />
                    </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Box display="flex" flexDirection="column">
                        <FontOptions
                            value={settings.fontFamily}
                            onClickOption={(newValue) => settings.onUpdateField('fontFamily', newValue)}
                            options={[defaultFont, 'Inter Variable', 'DM Sans Variable', 'Nunito Sans Variable']}
                        />
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}