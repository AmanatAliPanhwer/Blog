export interface Post {
  id: number;
  title: string;
  content: string;
  image?: string;
  video_id?: number | null;
  formatted_timestamp?: string;
  video?: VideoData | null;
}

export interface PostRaw {
  id: number;
  title: string;
  content: string;
  image?: string;
  video_id?: number | null;
  [key: string]: unknown;
}

export interface VideoData {
  id: number;
  filename?: string;
  filepath?: string;
  status?: string;
  url?: string;
}

export interface VideoRecord {
  id: number;
  filename: string;
  filepath: string;
  status: string;
}

export interface FilterParams {
  year?: string;
  month?: string;
  day?: string;
}
