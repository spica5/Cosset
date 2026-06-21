import { UniverseLayout } from 'src/layouts/universe/universe';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  return <UniverseLayout minimal>{children}</UniverseLayout>;
}
