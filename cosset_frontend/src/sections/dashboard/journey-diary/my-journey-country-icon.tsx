import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

type Props = {
  country: string;
};

export function MyJourneyCountryIcon({ country }: Props) {
  const key = country.trim().toLowerCase();

  if (key.includes('italy')) {
    return (
      <Box component="svg" viewBox="0 0 64 64" sx={{ width: 52, height: 52 }}>
        <path
          d="M12 48 L32 10 L52 48 Z"
          fill="none"
          stroke="#1F2A44"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M18 48 H46" stroke="#1F2A44" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="32" cy="30" r="4" fill="none" stroke="#1F2A44" strokeWidth="2" />
      </Box>
    );
  }

  if (key.includes('japan')) {
    return (
      <Box component="svg" viewBox="0 0 64 64" sx={{ width: 52, height: 52 }}>
        <path
          d="M14 18 H50 V46 H14 Z"
          fill="none"
          stroke="#2F5D9A"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M14 18 H50" stroke="#2F5D9A" strokeWidth="4" strokeLinecap="round" />
        <path d="M20 18 V46 M44 18 V46" stroke="#2F5D9A" strokeWidth="2.5" />
      </Box>
    );
  }

  if (key.includes('france')) {
    return (
      <Box component="svg" viewBox="0 0 64 64" sx={{ width: 52, height: 52 }}>
        <path
          d="M32 8 L38 24 H54 L41 34 L46 50 L32 40 L18 50 L23 34 L10 24 H26 Z"
          fill="none"
          stroke="#1F2A44"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </Box>
    );
  }

  if (key.includes('vietnam')) {
    return (
      <Box component="svg" viewBox="0 0 64 64" sx={{ width: 52, height: 52 }}>
        <path
          d="M20 44 C20 30 26 18 32 14 C38 18 44 30 44 44 Z"
          fill="none"
          stroke="#1F2A44"
          strokeWidth="2.5"
        />
        <path d="M16 44 H48" stroke="#1F2A44" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M24 30 H40" stroke="#1F2A44" strokeWidth="2" strokeLinecap="round" />
      </Box>
    );
  }

  if (key.includes('thailand')) {
    return (
      <Box component="svg" viewBox="0 0 64 64" sx={{ width: 52, height: 52 }}>
        <path
          d="M18 46 V24 L32 14 L46 24 V46"
          fill="none"
          stroke="#1F2A44"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M24 46 V30 H40 V46" stroke="#1F2A44" strokeWidth="2.5" />
        <path d="M28 20 H36" stroke="#1F2A44" strokeWidth="2" strokeLinecap="round" />
      </Box>
    );
  }

  return (
    <Box component="svg" viewBox="0 0 64 64" sx={{ width: 52, height: 52 }}>
      <circle cx="32" cy="32" r="18" fill="none" stroke="#1F2A44" strokeWidth="2.5" />
      <path
        d="M14 32 H50 M32 14 C24 22 24 42 32 50 C40 42 40 22 32 14 Z"
        fill="none"
        stroke="#1F2A44"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </Box>
  );
}
