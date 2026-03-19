'use client';

import { useRef, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import axios, { endpoints } from 'src/utils/axios';

import { Iconify } from 'src/components/dashboard/iconify';
import { UploadingOverlay } from 'src/components/dashboard/uploading-overlay';

// ----------------------------------------------------------------------

type Props = {
  albumId: string;
  onUploadSuccess?: () => void;
};

export function AlbumImageUpload({ albumId, onUploadSuccess }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imageTitle, setImageTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    setSelectedFiles((prev) => [...prev, ...imageFiles]);
  }, []);
  
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (files) {
      setSelectedFiles(Array.from(files));
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      
      // Append all files
      selectedFiles.forEach((file) => {
        formData.append('images', file);
      });
      
      // Append metadata (will be applied to all files)
      if (imageTitle) formData.append('imageTitle', imageTitle);
      if (description) formData.append('description', description);

      const response = await axios.post(endpoints.album.images.upload(albumId), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = progressEvent.total
            ? Math.round((progressEvent.loaded / progressEvent.total) * 100)
            : 0;
          setUploadProgress(Math.min(100, percentCompleted));
        },
      });

      if (response.status === 200) {
        // Reset form
        setSelectedFiles([]);
        setImageTitle('');
        setDescription('');
        if (fileInputRef.current) fileInputRef.current.value = '';

        onUploadSuccess?.();
      }
    } catch (error) {
      console.error('Failed to upload images:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFiles, imageTitle, description, albumId, onUploadSuccess]);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <>
      <UploadingOverlay isOpen={uploading} progress={uploadProgress} message="Uploading images..." />
      <Card sx={{ p: 3, overflow: 'auto' }}>
        <Stack spacing={3}>
        <Typography variant="h6">Upload Images</Typography>

        {/* <Box>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:gallery-add-bold" />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            Select Images
          </Button>
        </Box> */}

        <Box
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          sx={{
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            transition: (theme) =>
              theme.transitions.create(['border-color', 'background-color'], {
                duration: theme.transitions.duration.shorter,
              }),
            '&:hover': {
              backgroundColor: 'action.hover',
              borderColor: 'primary.main',
            },
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            id="file-input"
          />
          {/* <label htmlFor="file-input" style={{ cursor: 'pointer' }}> */}
            <Iconify icon="solar:upload-bold" sx={{ width: 48, height: 48, mb: 1 }} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Drag and drop images here, or click to select files
            </Typography>
          {/* </label> */}
        </Box>

        {selectedFiles.length > 0 && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {selectedFiles.length} file(s) selected
            </Typography>

            {selectedFiles.map((file, index) => (
              <Box
                key={`${file.name}-${file.lastModified}-${index}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" noWrap sx={{ flex: 1, mr: 2 }}>
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </Typography>

                <IconButton size="small" onClick={() => handleRemoveFile(index)} disabled={uploading}>
                  <Iconify icon="solar:close-circle-bold" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}

        <TextField
          fullWidth
          label="Image Title (optional)"
          value={imageTitle}
          onChange={(e) => setImageTitle(e.target.value)}
          disabled={uploading}
          helperText="Title will be applied to all selected images"
        />

        <TextField
          fullWidth
          multiline
          rows={2}
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={uploading}
          helperText="Description will be applied to all selected images"
        />

        {uploading && (
          <Box>
            <LinearProgress variant="determinate" value={uploadProgress} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Uploading... {uploadProgress}%
            </Typography>
          </Box>
        )}

        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:upload-bold" />}
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || uploading}
          fullWidth
        >
          {uploading ? 'Uploading...' : 'Upload Images'}
        </Button>
      </Stack>
    </Card>
    </>
  );
}
