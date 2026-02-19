import type { MotionValue } from 'framer-motion';

import { useSpring, useTransform } from 'framer-motion';

// ----------------------------------------------------------------------

export type UseHoverParallaxReturn = {
  offsetX: (force: number) => MotionValue<number>;
  offsetY: (force: number) => MotionValue<number>;
  onMouseLeave: () => void;
  onMouseMove: (event: React.MouseEvent<HTMLInputElement>) => void;
};

export function useHoverParallax(stiffness = 250, damping = 20): UseHoverParallaxReturn {
  const x = useSpring(0, { stiffness, damping });
  const y = useSpring(0, { stiffness, damping });

  const useOffsetX = (force: number) => useTransform(x, (event) => event / force);
  const useOffsetY = (force: number) => useTransform(y, (event) => event / force);

  const onMouseMove = (event: React.MouseEvent<HTMLInputElement>) => {
    x.set(event.clientX);
    y.set(event.clientY);
  };

  const onMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return {
    offsetX: useOffsetX,
    offsetY: useOffsetY,
    onMouseMove,
    onMouseLeave,
  };
}
