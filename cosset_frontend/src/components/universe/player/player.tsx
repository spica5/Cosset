import type ReactPlayer from 'react-player';
import type { ReactPlayerProps } from 'react-player';

import { forwardRef } from 'react';

import { StyledReactPlayer } from './styles';

// ----------------------------------------------------------------------

// https://github.com/CookPete/react-player

export const Player = forwardRef<ReactPlayer, ReactPlayerProps>((props, ref) => <StyledReactPlayer ref={ref} {...props} />);
