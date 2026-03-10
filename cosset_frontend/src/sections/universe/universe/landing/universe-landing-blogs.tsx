import type { BoxProps } from '@mui/material/Box';
import type { IBlogItem } from 'src/types/blog';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

// ----------------------------------------------------------------------

type Props = BoxProps & {
  blogs: IBlogItem[];
  blogsLoading?: boolean;
};

const formatDate = (value: unknown) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString();
};

const getSummary = (blog: IBlogItem) => {
  const source = (blog.description || blog.content || '').trim();
  if (!source) {
    return 'No description yet.';
  }

  return source.length > 160 ? `${source.slice(0, 160)}...` : source;
};

export function UniverseLandingBlogs({ blogs, blogsLoading = false, sx, ...other }: Props) {
  return (
    <Card
      id="blogs-section"
      component="section"
      sx={{ pb: 4, overflow: 'hidden', pt: { xs: 3, md: 6 }, ...sx }}
      {...other}
    >
      <Container>
        <Stack spacing={2} sx={{ textAlign: { xs: 'center', md: 'unset' } }}>
          <Typography variant="h2">Blogs ({blogs.length})</Typography>
        </Stack>

        <Box sx={{ py: { xs: 4, md: 6 } }}>
          {blogsLoading ? (
            <Typography color="text.secondary">Loading blogs...</Typography>
          ) : blogs.length === 0 ? (
            <Typography color="text.secondary">No shared blog posts found.</Typography>
          ) : (
            <Grid container spacing={2}>
              {blogs.map((blog) => (
                <Grid item xs={12} sm={6} md={4} key={blog.id}>
                  <Card sx={{ height: 1 }}>
                    <CardContent>
                      <Stack spacing={1}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                          <Typography variant="h6" noWrap>
                            {(blog.title || '').trim() || `Blog #${blog.id}`}
                          </Typography>

                          <Chip
                            size="small"
                            color={blog.isPublic === 1 ? 'success' : 'default'}
                            label={blog.isPublic === 1 ? 'Public' : 'Private'}
                          />
                        </Stack>

                        <Typography variant="caption" color="text.secondary">
                          Created: {formatDate(blog.createdAt)}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          {getSummary(blog)}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Container>
    </Card>
  );
}
