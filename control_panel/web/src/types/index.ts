import { ReactNode } from "react";

export type PageProps = {
  layout: React.ReactNode;
  title: string;
  subTitle: string | null;
  broadcrumbs: string[];
};

export type SwipeableDrawerProps = {
  button: ReactNode;
  drawerBody: ReactNode;
};
