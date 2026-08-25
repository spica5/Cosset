# Cosset API server setup guide

## Prerequisites

- Node.js 20.x (Recommended)

## Installation

**Using Npm**

```sh
npm i
npm run dev
```

Environment variables
---------------------

Copy `.env.example` to `.env` and set a strong `JWT_SECRET` before running in production.

### Object storage (`STORAGE_PROVIDER`)

Upload, download, and signed view URLs use a shared S3-compatible client. Choose the backend with:

| Value | Backend |
|-------|---------|
| `s3` (default) | AWS S3 or any S3-compatible store (e.g. Vultr) |
| `r2` | Cloudflare R2 |

**AWS S3 / compatible (`STORAGE_PROVIDER=s3`)**

```env
STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=...
# Optional custom endpoint (Vultr, MinIO, etc.)
# AWS_S3_ENDPOINT=https://ewr1.vultrobjects.com
# Optional public/CDN base for public objects
# S3_PUBLIC_BASE_URL=https://cdn.example.com
```

**Cloudflare R2 (`STORAGE_PROVIDER=r2`)**

Direct browser upload (recommended on Vercel):

1. Authenticated client calls `POST /api/upload-url` with `{ key, contentType }`
2. API returns a temporary R2 presigned PUT URL
3. Browser uploads the file **directly to R2** (file body never hits Vercel)

```env
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
# Optional custom domain or r2.dev public URL
# R2_PUBLIC_BASE_URL=https://pub-xxxxx.r2.dev
```

On the frontend, set the same provider so uploads skip the Vercel proxy:

```env
NEXT_PUBLIC_STORAGE_PROVIDER=r2
```

R2 bucket CORS must allow browser PUT from your app origin, for example:

```json
[
  {
    "AllowedOrigins": ["https://your-app.vercel.app", "http://localhost:8081"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

R2 does not use AWS object ACLs; public access is controlled via bucket settings / custom domains.

Example:

```env
JWT_SECRET=replace-with-a-strong-random-secret
GOOGLE_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
```

### Sign in with Google

1. Create an OAuth 2.0 **Web client** in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Add **Authorized JavaScript origins** for your frontend, e.g. `https://cosset.global`, `http://localhost:8083`.
3. Set the same client ID on backend and frontend:

```env
# cosset_backend/.env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# cosset_frontend/.env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

The frontend sends a Google ID token to `POST /api/auth/google`; the backend verifies it and returns the same JWT used by email sign-in.

## Default port

http://localhost:7272
