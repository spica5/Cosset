import type { ReactPlayerProps } from 'react-player';

import { StyledReactPlayer } from './styles';

// ----------------------------------------------------------------------

// https://github.com/CookPete/react-player

export function Player({ ...other }: ReactPlayerProps) {
  return <StyledReactPlayer {...other} />;
}
