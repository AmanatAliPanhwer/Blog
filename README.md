# Blog

A hacker-themed blog platform built with **Next.js 16** (App Router), migrated from Flask.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 6
- **UI**: React 19
- **Database**: Supabase (PostgreSQL + Storage)
- **Video**: HLS.js with external ffmpeg transcoding service
- **Image Viewer**: Viewer.js

## Getting Started

```bash
npm install
```

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password
SESSION_SECRET=random-secret
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production

```bash
npm run build
npm start
```

## Features

- Admin authentication with session cookies
- Create, edit, delete blog posts
- Image upload & lightbox viewer
- Video upload with HLS adaptive streaming
- Infinite scroll pagination
- Date-based post filtering
- Hacker-themed dark UI
- Responsive design

## Project Structure

```
app/            # Next.js App Router pages & API routes
components/     # React components (PostCard, VideoPlayer, etc.)
lib/            # Shared utilities (auth, posts, supabase client)
public/         # Static assets (CSS, JS, images, SVGs)
types/          # TypeScript type definitions
```

## Video Processing

Videos are transcoded to HLS by an external ffmpeg microservice. See [ffmpeg_microservice.md](ffmpeg_microservice.md) for details.

## License

MIT
