import type { StackProps } from '@mui/material/Stack';
import type { ButtonBaseProps } from '@mui/material/ButtonBase';

// ----------------------------------------------------------------------

export type NavItemBaseProps = {
  path: string;
  title: string;
  icon?: React.ReactNode;
  children?: {
    subheader: string;
    coverUrl?: string;
    items: {
      title: string;
      path: string;
    }[];
  }[];
};

export type NavItemStateProps = {
  open?: boolean;
  active?: boolean;
  subItem?: boolean;
  hasChild?: boolean;
  externalLink?: boolean;
};

export type NavItemProps = ButtonBaseProps & NavItemBaseProps & NavItemStateProps;

export type NavListProps = {
  data: NavItemBaseProps;
};

export type NavSubListProps = {
  coverUrl?: string;
  subheader: string;
  items: {
    title: string;
    path: string;
  }[];
};

export type NavMainProps = StackProps & {
  data: NavItemBaseProps[];
};
