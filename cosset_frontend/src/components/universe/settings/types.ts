import type { Theme, SxProps } from '@mui/material/styles';
import type { ThemeDirection, ThemeColorScheme } from 'src/theme/universe/types';

// ----------------------------------------------------------------------

export type SettingsDrawerProps = {
  sx?: SxProps<Theme>;
  hideFont?: boolean;
  hidePresets?: boolean;
  hideDirection?: boolean;
  hideColorScheme?: boolean;
};

export type SettingsState = {
  fontFamily: string;
  direction: ThemeDirection;
  colorScheme: ThemeColorScheme;
  primaryColor: 'default' | 'preset1' | 'preset2' | 'preset3' | 'preset4' | 'preset5';
};

export type SettingsContextValue = SettingsState & {
  canReset: boolean;
  onReset: () => void;
  onUpdate: (updateValue: Partial<SettingsState>) => void;
  onUpdateField: (
    name: keyof SettingsState,
    updateValue: SettingsState[keyof SettingsState]
  ) => void;
  // Drawer
  openDrawer: boolean;
  onCloseDrawer: () => void;
  onToggleDrawer: () => void;
};

export type SettingsProviderProps = {
  settings: SettingsState;
  children: React.ReactNode;
};
