# Blog Platform Project Description

## 1. Project Title
**Hacker-Themed Next.js Blog Platform**

## 2. Overview/Purpose
A blog platform built with Next.js 16 (App Router), migrated from the original Flask implementation. Provides a robust system for creating, publishing, and viewing blog posts with a distinctive hacker-themed dark UI. Uses Supabase for data persistence and cloud storage.

## 3. Key Features
- **Blog Post Management**: Create, edit, delete posts with titles, HTML content, and optional images/videos
- **Admin Authentication**: Cookie-based session authentication with remember-me tokens
- **Supabase Integration**: PostgreSQL database + cloud storage for images and videos
- **Infinite Scroll**: Client-side lazy loading with scroll-based pagination
- **Date Filtering**: Filter posts by year, month, and day
- **Image Lightbox**: Click-to-zoom via Viewer.js
- **HLS Video Player**: Custom player with quality selection, speed control, PiP, fullscreen
- **Hacker-Themed UI**: Custom dark theme CSS

## 4. Technology Stack

### Backend
- **Next.js 16**: React framework with App Router, server components, and API routes
- **TypeScript 6**: Type-safe development
- **Supabase JS**: Database queries and storage operations

### Frontend
- **React 19**: UI library with Server Components
- **CSS3**: Custom dark theme (no Tailwind)
- **HLS.js**: HLS video streaming
- **Viewer.js**: Image lightbox

### Infrastructure
- **Supabase**: PostgreSQL database + cloud storage for images and videos
- **Vercel**: Deployment target (or any Node.js host)

## 5. Architecture

### Application Structure
- **`app/`**: Next.js App Router — pages (server components) + API routes (route handlers)
- **`components/`**: React client components (PostCard, VideoPlayer, FilterPanel, Toast, ImageLightbox)
- **`lib/`**: Shared utilities — `supabase.ts` (lazy client), `auth.ts` (cookie sessions), `posts.ts` (CRUD)
- **`public/static/`**: Static assets served at `/static/` — CSS, JS libraries, SVGs
- **`types/`**: TypeScript type definitions

### Data Flow
1. Server Components (`app/page.tsx`, `app/post/[id]/page.tsx`) fetch data via `lib/posts.ts` and pass as props to Client Components
2. Client Components (`HomeClient.tsx`, `PostViewClient.tsx`) render interactive UI
3. API routes (`/api/posts`, `/api/filter`, etc.) handle mutations and paginated queries
4. Admin auth is managed via encrypted cookies (`lib/auth.ts`)
5. Video uploads are processed asynchronously by an external ffmpeg microservice

## 6. Setup

### Prerequisites
- Node.js 20+
- Supabase project with PostgreSQL and Storage buckets

### Installation
```bash
git clone <repo>
npm install
```

Configure `.env.local` with Supabase credentials, admin username/password, and session secret.

### Run
```bash
npm run dev    # Development at http://localhost:3000
npm run build  # Production build
npm start      # Production server
```

## 7. Deployment

Deploy to Vercel:

```bash
npx vercel
```

Or any Node.js host:

```bash
npm run build
npm start
```

## 8. Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (for storage uploads) |
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD` | Admin login password |
| `SESSION_SECRET` | Cookie encryption secret |
| `BLOG_IMAGES_BUCKET` | Storage bucket for images (default: `blog_images`) |
| `BLOG_VIDEOS_BUCKET` | Storage bucket for videos (default: `blog_videos`) |
| `FFMPEG_SERVICE_URL` | External ffmpeg HLS transcoding service URL |
