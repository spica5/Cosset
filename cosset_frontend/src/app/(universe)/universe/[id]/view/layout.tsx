import { UniverseLayout } from 'src/layouts/universe/universe';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <UniverseLayout
      header={{
        sx: { position: { md: 'fixed' } },
      }}
    >
      {children}
    </UniverseLayout>
  );
}
