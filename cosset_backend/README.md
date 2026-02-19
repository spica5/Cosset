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

Copy `.env.example` to `.env` and set a strong `JWT_SECRET` before running in production. Example:

```env
JWT_SECRET=replace-with-a-strong-random-secret
```

## Default port

http://localhost:7272
