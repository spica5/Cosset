'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Stack,
  TextField,
  Button,
  Box,
  CircularProgress,
  Typography,
  Avatar,
  Grid,
  Divider,
} from '@mui/material';
import { toast } from 'sonner';

import { useGetCurrentUser, updateCurrentUser } from 'src/actions/user';
import { useAuthContext } from 'src/auth/hooks';
import axiosInstance, { endpoints } from 'src/utils/axios';
import { uuidv4 } from 'src/utils/uuidv4';

import { getS3SignedUrl } from 'src/utils/helper';

// ==============================

/**
 * Extract S3 key from full URL (fallback if backend returns URL instead of key)
 */
function extractKeyFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Extract path and remove leading slash
    return urlObj.pathname.substring(1);
  } catch {
    // If not a valid URL, assume it's already a key
    return url;
  }
}

export function ProfileForm() {
  const { user, userLoading } = useGetCurrentUser();
  const { checkUserSession } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [signedPhotoUrl, setSignedPhotoUrl] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    country: '',
    address: '',
    state: '',
    city: '',
    zipCode: '',
    photoURL: '',
    about: '',
  });

  const [initialFormData, setInitialFormData] = useState({ ...formData });

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      const newFormData = {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        country: user.country || '',
        address: user.address || '',
        state: user.state || '',
        city: user.city || '',
        zipCode: user.zipCode || '',
        photoURL: user.photoURL || '',
        about: user.about || '',
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
    }
  }, [user]);

  // Update signed URL when photoUrl changes
  useEffect(() => {
    const updateSignedUrl = async () => {
      if (formData.photoURL) {
        const url = await getS3SignedUrl(formData.photoURL);
        setSignedPhotoUrl(url);
      } else {
        setSignedPhotoUrl('');
      }
    };
    updateSignedUrl();
  }, [formData.photoURL]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      setIsUploading(true);
      try {
        const ext = file.name.split('.').pop() || '';
        const key = `profile/${user.id}/${uuidv4()}.${ext}`;
        const data = new FormData();
        data.append('file', file);
        data.append('key', key);

        const res = await axiosInstance.post(endpoints.upload.image, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const result = res.data as { key?: string; url?: string };
        // Store the key instead of the full URL
        const photoKey = result.key || (result.url ? extractKeyFromUrl(result.url) : '');
        if (photoKey) {
          setFormData((prev) => ({ ...prev, photoURL:photoKey }));
          toast.success('Photo uploaded successfully');
        }
      } catch (err) {
        console.error('Photo upload failed', err);
        toast.error('Failed to upload photo');
      } finally {
        setIsUploading(false);
      }
    },
    [user]
  );
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      // Only send changed fields
      const changes: Record<string, any> = {};
      Object.keys(formData).forEach((key) => {
        if (formData[key as keyof typeof formData] !== initialFormData[key as keyof typeof initialFormData]) {
          changes[key] = formData[key as keyof typeof formData] || null;
        }
      });

      if (Object.keys(changes).length === 0) {
        toast.info('No changes to save');
        return;
      }

      await updateCurrentUser(changes);
      // Refresh global auth user so account avatar and other auth-based UI update
      try {
        if (typeof checkUserSession === 'function') {
          await checkUserSession();
        }
      } catch (err) {
        // non-fatal: continue even if auth refresh fails
        console.warn('Failed to refresh auth session', err);
      }
      setInitialFormData(formData);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update profile'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isChanged =
    JSON.stringify(formData) !== JSON.stringify(initialFormData);

  if (userLoading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Avatar Section */}                            
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 0 }}>
              Profile Photo
            </Typography>
              <Button variant="outlined" component="label" disabled={isUploading}>
                {isUploading ? <CircularProgress size={20} /> : 'Upload'}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box>
              <Avatar
                src={signedPhotoUrl}
                sx={{
                  width: 100,
                  height: 100,
                  fontSize: '2.5rem',
                }}
              >
                {formData.firstName?.charAt(0) || 'U'}
              </Avatar>
            </Box>
            <Box>
              <Typography variant="h6">
                {formData.firstName || 'User'} {formData.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formData.email}
              </Typography>
            </Box>
          </Box>
          

          <Divider />

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              {/* Basic Information */}
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  Basic Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      disabled
                      variant="outlined"
                      helperText="Email cannot be changed"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>
                  
                </Grid>
              </Card>

              <Divider />

              {/* Address Information */}
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  Address Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="City"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="State"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Zip Code"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </Card>

              <Divider />

              {/* Other Information */}
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  Additional Information
                </Typography>
                <TextField
                  fullWidth
                  label="About Me"
                  name="about"
                  value={formData.about}
                  onChange={handleChange}
                  variant="outlined"
                  multiline
                  rows={4}
                  helperText="Tell us about yourself"
                />
              </Card>

              <Divider />

              {/* Actions */}
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={() => {
                    setFormData(initialFormData);
                  }}
                  disabled={!isChanged || isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!isChanged || isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </Stack>
      </CardContent>
    </Card>
  );
}
