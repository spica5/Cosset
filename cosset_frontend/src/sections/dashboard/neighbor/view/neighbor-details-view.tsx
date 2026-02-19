'use client';

import type { INeighborItem } from 'src/types/neighbor';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import { paths } from 'src/routes/paths';

import { useTabs } from 'src/hooks/use-tabs';

import { NEIGHBOR_DETAILS_TABS } from 'src/_mock/dashboard';
import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { Label } from 'src/components/dashboard/label';

import { NeighborDetailsContent } from '../neighbor-details-content';
import { NeighborDetailsFriends } from '../neighbor-details-friends';
import { NeighborDetailsToolbar } from '../neighbor-details-toolbar';

// ----------------------------------------------------------------------

type Props = {
  neighbor?: INeighborItem;
};

export function NeighborDetailsView({ neighbor }: Props) {
  const tabs = useTabs('content');

  const renderTabs = (
    <Tabs value={tabs.value} onChange={tabs.onChange} sx={{ mb: { xs: 3, md: 5 } }}>
      {NEIGHBOR_DETAILS_TABS.map((tab) => (
        <Tab
          key={tab.value}
          iconPosition="end"
          value={tab.value}
          label={tab.label}
          icon={
            tab.value === 'friends' ? <Label variant="filled">{neighbor?.friends.length}</Label> : ''
          }
        />
      ))}
    </Tabs>
  );

  return (
    <DashboardContent>
      <NeighborDetailsToolbar
        backLink={paths.dashboard.community.neighbor.root}
        liveLink="#"
      />
      {renderTabs}

      {tabs.value === 'content' && <NeighborDetailsContent neighbor={neighbor} />}

      {tabs.value === 'friends' && <NeighborDetailsFriends friends={neighbor?.friends} />}
    </DashboardContent>
  );
}
