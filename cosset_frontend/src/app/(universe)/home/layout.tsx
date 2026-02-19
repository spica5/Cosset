import { MainLayout } from 'src/layouts/universe/main';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <MainLayout
      header={{
        sx: {
          position: { md: 'fixed' },
          color: { md: 'common.white' },
        },
      }}
    >
      {children}
    </MainLayout>
  );
}
