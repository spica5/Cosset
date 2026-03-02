'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card/Card';
import { useTheme, useColorScheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import COLORS from 'src/theme/dashboard/core/colors.json';
import { defaultFont } from 'src/theme/dashboard/core/typography';
import PRIMARY_COLOR from 'src/theme/dashboard/with-settings/primary-color.json';

import { useSettingsContext } from 'src/components/dashboard/settings/context';
import { BaseOption } from 'src/components/dashboard/settings/drawer/base-option';
import { NavOptions } from 'src/components/dashboard/settings/drawer/nav-options';
import { FontOptions } from 'src/components/dashboard/settings/drawer/font-options';
import { PresetsOptions } from 'src/components/dashboard/settings/drawer/presets-options';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

// ---------------------------------------------------------------

export function AppearanceView() {
  const settings = useSettingsContext();
  const { mode, setMode } = useColorScheme();

  const renderMode = (
    <BaseOption
      label="Dark mode"
      icon="moon"
      selected={settings.colorScheme === 'dark'}
      onClick={() => {
        settings.onUpdateField('colorScheme', mode === 'light' ? 'dark' : 'light');
        setMode(mode === 'light' ? 'dark' : 'light');
      }}
    />
  );

  const renderContrast = (
    <BaseOption
      label="Contrast"
      icon="contrast"
      selected={settings.contrast === 'hight'}
      onClick={() =>
        settings.onUpdateField('contrast', settings.contrast === 'default' ? 'hight' : 'default')
      }
    />
  );

  const renderRTL = (
    <BaseOption
      label="Right to left"
      icon="align-right"
      selected={settings.direction === 'rtl'}
      onClick={() =>
        settings.onUpdateField('direction', settings.direction === 'ltr' ? 'rtl' : 'ltr')
      }
    />
  );

  const renderCompact = (
    <BaseOption
      tooltip="Dashboard only and available at large resolutions > 1600px (xl)"
      label="Compact"
      icon="autofit-width"
      selected={settings.compactLayout}
      onClick={() => settings.onUpdateField('compactLayout', !settings.compactLayout)}
    />
  );

  const renderPresets = (
    <PresetsOptions
      value={settings.primaryColor}
      onClickOption={(newValue: string) => settings.onUpdateField('primaryColor', newValue)}
      options={[
        { name: 'default', value: COLORS.primary.main },
        { name: 'cyan', value: PRIMARY_COLOR.cyan.main },
        { name: 'purple', value: PRIMARY_COLOR.purple.main },
        { name: 'blue', value: PRIMARY_COLOR.blue.main },
        { name: 'orange', value: PRIMARY_COLOR.orange.main },
        { name: 'red', value: PRIMARY_COLOR.red.main },
      ]}
    />
  );

  const renderNav = (
    <NavOptions
      value={{
        color: settings.navColor,
        layout: settings.navLayout,
      }}
      onClickOption={{
        color: (newValue: string) => settings.onUpdateField('navColor', newValue),
        layout: (newValue: string) => settings.onUpdateField('navLayout', newValue),
      }}
      options={{
        colors: ['integrate', 'apparent'],
        layouts: ['vertical', 'horizontal', 'mini'],
      }}
    />
  );

  const renderFont = (
    <FontOptions
      value={settings.fontFamily}
      onClickOption={(newValue: string) => settings.onUpdateField('fontFamily', newValue)}
      options={[defaultFont, 'Inter Variable', 'DM Sans Variable', 'Nunito Sans Variable']}
    />
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Appearance"
        links={[{ name: 'Dashboard', href: paths.dashboard.settings.root }, { name: 'Appearance' }]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      
      <Card sx={{ p: 3, mb: 4 }}>

        <Stack spacing={4}>
            {/* Color Scheme, Contrast, RTL, Compact */}
            <Box gap={2} display="grid" gridTemplateColumns="repeat(2, 1fr)">
                {renderMode}
                {renderContrast}
                {renderRTL}
                {renderCompact}
            </Box>

            {/* Navigation Options */}
            {renderNav}

            {/* Color Presets */}
            {renderPresets}

            {/* Font Options */}
            {renderFont}
        </Stack>
      </Card>
    </DashboardContent>
  );
}
