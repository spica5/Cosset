"use client";

import type { StackProps } from "@mui/material/Stack";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export type EmptyContentProps = StackProps & {
  title?: string;
  description?: string;
  filled?: boolean;
  imgUrl?: string;
  action?: React.ReactNode;
};

export function EmptyContent({
  title = "No data",
  description,
  filled,
  action,
  sx,
  ...other
}: EmptyContentProps) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1}
      sx={{
        py: 6,
        px: 3,
        ...(filled
          ? {
              borderRadius: 2,
              border: "1px dashed",
              borderColor: "divider",
              bgcolor: "action.hover",
            }
          : null),
        ...sx,
      }}
      {...other}
    >
      <Typography variant="h6">{title}</Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {description}
        </Typography>
      ) : null}
      {action}
    </Stack>
  );
}
