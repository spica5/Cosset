import { defaultFont } from 'src/theme/universe/core/typography';

import type { SettingsState } from './types';

// ----------------------------------------------------------------------

export const STORAGE_KEY = 'universe-settings';

export const defaultSettings: SettingsState = {
  colorScheme: 'light',
  direction: 'ltr',
  primaryColor: 'default',
  fontFamily: defaultFont,
} as const;
