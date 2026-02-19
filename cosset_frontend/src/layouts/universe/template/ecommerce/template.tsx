'use client';

import { Header } from './header';

// ----------------------------------------------------------------------

type EcommerceTemplateProps = {
  children: React.ReactNode;
};

export function EcommerceTemplate({ children }: EcommerceTemplateProps) {
  return (
    <>
      <Header />

      {children}
    </>
  );
}
