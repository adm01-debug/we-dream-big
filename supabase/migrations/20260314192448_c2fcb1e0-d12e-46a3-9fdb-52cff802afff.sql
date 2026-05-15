-- Permitir upload de thumbnails (JPEG/PNG/WEBP) no bucket de vídeos
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg',
  'video/ogg',
  'image/jpeg',
  'image/png',
  'image/webp'
]
WHERE id = 'product-videos';