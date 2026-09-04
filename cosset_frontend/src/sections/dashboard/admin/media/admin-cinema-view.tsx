'use client';

import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { Iconify } from 'src/components/dashboard/iconify';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { useGetCinemaScreenings } from 'src/actions/cinema-film-screening';

import { CINEMA_CATEGORIES, resolveCinemaCategoryId, type CinemaCategory } from 'src/sections/dashboard/cinema/cinema-categories';
import { CinemaCategoryFilmsPanel } from 'src/sections/dashboard/cinema/cinema-category-films-panel';
import { CinemaHubTodayPanel } from 'src/sections/dashboard/cinema/cinema-hub-today-panel';
import { CINEMA_GOLD, CINEMA_SERIF } from 'src/sections/dashboard/cinema/cinema-theater-theme';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin } from 'src/auth/utils/role';

// ----------------------------------------------------------------------

export function AdminCinemaView() {
  const router = useRouter();
  const { user, loading } = useAuthContext();
  const isAdmin = isUserAdmin(user?.role);

  const [activeCategoryId, setActiveCategoryId] = useState<CinemaCategory>(
    CINEMA_CATEGORIES[0]?.id || 'classic',
  );

  const { screenings: classicScreenings, screeningsLoading: classicLoading } =
    useGetCinemaScreenings(null, 'classic', { allCatalog: true });
  const { screenings: genreScreenings, screeningsLoading: genreLoading } = useGetCinemaScreenings(
    null,
    'genre',
    { allCatalog: true },
  );

  const scheduleScreenings = useMemo(() => {
    const merged = [...(classicScreenings || []), ...(genreScreenings || [])];
    const seen = new Set<number>();

    return merged.filter((screening) => {
      const id = Number(screening.id);
      if (!Number.isFinite(id) || seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  }, [classicScreenings, genreScreenings]);

  const scheduleLoading = classicLoading || genreLoading;

  const activeCategory = useMemo(
    () => CINEMA_CATEGORIES.find((item) => item.id === activeCategoryId) || CINEMA_CATEGORIES[0],
    [activeCategoryId],
  );

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      router.replace(paths.dashboard.root);
    }
  }, [isAdmin, loading, router, user]);

  if (loading) {
    return null;
  }

  if (!isAdmin) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Manage Cinema"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Admin', href: paths.dashboard.admin.media.root },
            { name: 'Media', href: paths.dashboard.admin.media.root },
            { name: 'Cinema' },
          ]}
          sx={{ mb: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 } }}
        />

        <Alert
          severity="warning"
          action={
            <Button component={RouterLink} href={paths.dashboard.root} color="inherit" size="small">
              Go back
            </Button>
          }
        >
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">Admin access required</Typography>
            <Typography variant="body2">
              Only administrators can manage cinema content from Media.
            </Typography>
          </Stack>
        </Alert>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Manage Cinema"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Admin', href: paths.dashboard.admin.media.root },
          { name: 'Media', href: paths.dashboard.admin.media.root },
          { name: 'Cinema' },
        ]}
        sx={{ mb: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 } }}
      />

      <Stack spacing={3}>
        <Card sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1.5,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'primary.lighter',
                color: 'primary.main',
              }}
            >
              <Iconify icon="solar:clapperboard-play-bold" width={26} />
            </Box>
            <Box>
              <Typography variant="h5">Cinema</Typography>
              <Typography variant="body2" color="text.secondary">
                Add, update, and delete cinema films, and schedule showtimes for each room.
                Community → Cinema is where people reserve screenings and open the cinema.
              </Typography>
            </Box>
          </Stack>
        </Card>

        <Card sx={{ p: { xs: 1.5, md: 2 }, overflow: 'hidden' }}>
          <CinemaHubTodayPanel
            screenings={scheduleScreenings}
            loading={scheduleLoading}
            mode="all"
            showCalendar
            onSelectScreening={(screening) => {
              const categoryId = resolveCinemaCategoryId(String(screening.filmCategory || ''));
              if (categoryId) {
                setActiveCategoryId(categoryId);
              }
            }}
          />
        </Card>

        <Stack spacing={2}>
          <Stack spacing={1.5} sx={{ width: 1 }}>
            <Typography
              sx={{
                fontFamily: CINEMA_SERIF,
                fontWeight: 700,
                fontSize: { xs: '0.78rem', sm: '0.88rem' },
                color: CINEMA_GOLD,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Choose Your Cinema Room
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: { xs: 1.25, sm: 1.5 },
                width: 1,
              }}
            >
              {CINEMA_CATEGORIES.map((item) => {
                const selected = item.id === activeCategoryId;
                const tabIcon =
                  item.id === 'genre' ? 'solar:stars-bold' : 'solar:videocamera-record-bold';
                const accent = selected ? item.accent : 'rgba(170,170,170,0.72)';
                const muted = selected ? 'rgba(245,230,200,0.78)' : 'rgba(170,170,170,0.62)';

                return (
                  <Button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveCategoryId(item.id)}
                    sx={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: { xs: 1.5, sm: 2 },
                      width: 1,
                      minHeight: { xs: 84, sm: 96 },
                      height: 'auto',
                      px: { xs: 2, sm: 2.5 },
                      py: { xs: 1.75, sm: 2 },
                      borderRadius: { xs: 2, md: 3 },
                      textTransform: 'none',
                      textAlign: 'left',
                      color: accent,
                      bgcolor: selected ? 'rgba(18,14,10,0.92)' : 'rgba(12,12,12,0.72)',
                      border: selected
                        ? `1px solid ${item.accent}`
                        : '1px solid rgba(140,140,140,0.35)',
                      boxShadow: selected
                        ? `0 0 0 1px rgba(${item.accentRgb}, 0.18), 0 0 28px rgba(${item.accentRgb}, 0.22), inset 0 0 40px rgba(${item.accentRgb}, 0.08)`
                        : 'none',
                      overflow: 'hidden',
                      '&:hover': {
                        bgcolor: selected ? 'rgba(22,16,10,0.96)' : 'rgba(20,20,20,0.85)',
                        borderColor: selected ? item.accent : 'rgba(170,170,170,0.5)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: { xs: 44, sm: 52 },
                        height: { xs: 44, sm: 52 },
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        color: accent,
                        border: `1.5px solid ${
                          selected ? `rgba(${item.accentRgb}, 0.85)` : 'rgba(140,140,140,0.45)'
                        }`,
                        bgcolor: selected
                          ? `rgba(${item.accentRgb}, 0.1)`
                          : 'rgba(255,255,255,0.03)',
                        boxShadow: selected
                          ? `0 0 16px rgba(${item.accentRgb}, 0.25)`
                          : 'none',
                      }}
                    >
                      <Iconify icon={tabIcon} width={22} />
                    </Box>

                    <Stack spacing={0.35} alignItems="flex-start" sx={{ minWidth: 0, flex: 1, pb: 0.75 }}>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: { xs: '0.78rem', sm: '0.95rem', md: '1.05rem' },
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: accent,
                          lineHeight: 1.2,
                        }}
                      >
                        {item.title}
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 400,
                          fontSize: { xs: '0.75rem', sm: '0.85rem' },
                          color: muted,
                          lineHeight: 1.3,
                        }}
                      >
                        {item.tabSubtitle}
                      </Typography>
                    </Stack>

                    {selected ? (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: '50%',
                          bottom: 10,
                          transform: 'translateX(-50%)',
                          width: 56,
                          height: 3,
                          borderRadius: 999,
                          bgcolor: item.accent,
                          boxShadow: `0 0 10px rgba(${item.accentRgb}, 0.8)`,
                        }}
                      />
                    ) : null}
                  </Button>
                );
              })}
            </Box>
          </Stack>

          {activeCategory ? (
            <Card key={activeCategory.id} id={`cinema-${activeCategory.id}`} sx={{ p: { xs: 2, md: 3 } }}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 1.5,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: `${activeCategory.accent}18`,
                      color: activeCategory.accent,
                      flexShrink: 0,
                    }}
                  >
                    <Iconify icon={activeCategory.icon} width={22} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6">{activeCategory.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {activeCategory.description}
                    </Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                      {activeCategory.chips.map((chip) => (
                        <Box
                          key={chip}
                          sx={{
                            px: 1,
                            py: 0.2,
                            borderRadius: activeCategory.id === 'genre' ? 999 : 0.75,
                            typography: 'caption',
                            fontWeight: 700,
                            color: activeCategory.accent,
                            border: `1px solid ${activeCategory.accent}55`,
                            bgcolor: `${activeCategory.accent}12`,
                          }}
                        >
                          {chip}
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Stack>

                <CinemaCategoryFilmsPanel
                  category={activeCategory}
                  showScreenings
                  canManage
                  allCatalog
                />
              </Stack>
            </Card>
          ) : null}
        </Stack>
      </Stack>
    </DashboardContent>
  );
}
