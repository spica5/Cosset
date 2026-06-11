'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  getStoredMailLayoutMode,
  setStoredMailLayoutMode,
  type MailLayoutMode,
} from 'src/sections/dashboard/mail/mail-layout-mode';

export function useMailLayoutMode() {
  const [layoutMode, setLayoutMode] = useState<MailLayoutMode>(getStoredMailLayoutMode);

  useEffect(() => {
    setLayoutMode(getStoredMailLayoutMode());
  }, []);

  const toggleLayoutMode = useCallback(() => {
    setLayoutMode((current) => {
      const next: MailLayoutMode = current === 'horizontal' ? 'sidebar' : 'horizontal';
      setStoredMailLayoutMode(next);
      return next;
    });
  }, []);

  const setMailLayoutMode = useCallback((mode: MailLayoutMode) => {
    setStoredMailLayoutMode(mode);
    setLayoutMode(mode);
  }, []);

  return { layoutMode, toggleLayoutMode, setMailLayoutMode };
}
