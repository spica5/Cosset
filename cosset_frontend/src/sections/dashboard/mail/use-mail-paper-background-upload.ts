import { useRef, useState, useCallback, type ChangeEvent } from 'react';

import { uuidv4 } from 'src/utils/uuidv4';

import { uploadFileToS3 } from 'src/actions/upload';
import { createMailBackground } from 'src/actions/mail-background-api';
import { toast } from 'src/components/dashboard/snackbar';

// ----------------------------------------------------------------------

type Options = {
  onCreated?: (imageKey: string) => void;
  disabled?: boolean;
};

export function useMailPaperBackgroundUpload({ onCreated, disabled }: Options) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const openFilePicker = useCallback(() => {
    if (disabled || uploading) {
      return;
    }

    inputRef.current?.click();
  }, [disabled, uploading]);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';

      if (!file) {
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please choose an image file.');
        return;
      }

      setUploading(true);

      try {
        const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const key = `mail/backgrounds/${uuidv4()}.${extension}`;
        await uploadFileToS3({ file, key });
        await createMailBackground({
          imageKey: key,
          title: file.name.replace(/\.[^.]+$/, '').slice(0, 255) || null,
        });
        onCreated?.(key);
        toast.success('Background image added to library.');
      } catch {
        toast.error('Could not upload background image.');
      } finally {
        setUploading(false);
      }
    },
    [onCreated],
  );

  return {
    uploading,
    openFilePicker,
    inputRef,
    handleFileChange,
  };
}
