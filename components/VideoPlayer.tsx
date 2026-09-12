"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture,
  Play,
  TriangleAlert,
  Volume2,
  VolumeX,
} from "lucide-react";
import Hls from "hls.js";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  video: {
    id: number;
    filename?: string;
    status?: string;
    url?: string;
  };
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const HIDE_DELAY = 2500;

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fill(v: number, max: number): React.CSSProperties {
  const pct = max > 0 ? Math.min(100, (v / max) * 100) : 0;
  return {
    background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${pct}%, rgba(255,255,255,0.25) ${pct}%, rgba(255,255,255,0.25) 100%)`,
  };
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [levels, setLevels] = useState<Array<{ height?: number }>>([]);
  const [quality, setQuality] = useState(-1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [failed, setFailed] = useState(false);

  const url = video.url;
  const isProcessed = video.status === "processed";
  const status = video.status || "unknown";

  const bumpControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      const el = videoRef.current;
      if (el && !el.paused) setControlsVisible(false);
    }, HIDE_DELAY);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  // Wire HLS or direct source.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    setFailed(false);

    let hls: Hls | null = null;
    const useHls = isProcessed && !!url && url.includes(".m3u8") && Hls.isSupported();
    if (useHls) {
      hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(el);
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setLevels(data.levels ?? []);
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => setQuality(data.level));
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError();
        } else {
          setFailed(true);
          hls?.destroy();
        }
      });
    } else if (url) {
      el.src = url;
    }

    return () => {
      hls?.destroy();
      hlsRef.current = null;
      if (!useHls) {
        el.removeAttribute("src");
        el.load();
      }
    };
  }, [url, isProcessed]);

  useEffect(() => {
    const onFsChange = () => {
      setFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused || el.ended) el.play().catch(() => {});
    else el.pause();
  }, []);

  const seek = (value: number) => {
    const el = videoRef.current;
    if (el && Number.isFinite(el.duration)) el.currentTime = value;
  };

  const changeVolume = (value: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = value / 100;
    el.muted = value === 0;
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted && el.volume > 0;
  };

  const selectSpeed = (s: number) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
    setShowSpeed(false);
  };

  const selectQuality = (level: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = level;
    setQuality(level);
    setShowQuality(false);
  };

  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else c.requestFullscreen().catch(() => {});
  }, []);

  const togglePip = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else {
      el.requestPictureInPicture().catch(() => {});
    }
  }, []);

  const pipSupported =
    typeof document !== "undefined" && document.pictureInPictureEnabled;
  const hasVariants = levels.length > 1;
  const progress = Number.isFinite(duration) ? currentTime : 0;
  const maxProgress = Number.isFinite(duration) ? duration : 0;
  const volPct = muted ? 0 : Math.round(volume * 100);

  const ctrlBtn =
    "flex size-8 items-center justify-center rounded-md text-white transition-colors hover:bg-white/15 disabled:pointer-events-none disabled:opacity-40";

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black",
        fullscreen && "rounded-none border-0"
      )}
      onMouseMove={bumpControls}
      onMouseLeave={() => {
        const el = videoRef.current;
        if (el && !el.paused) setControlsVisible(false);
      }}
    >
      <video
        ref={videoRef}
        className="size-full"
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        onClick={togglePlay}
        onPlay={() => {
          setPlaying(true);
          bumpControls();
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted);
          setVolume(e.currentTarget.volume);
        }}
        onError={() => setFailed(true)}
      />

      <>
          {!playing ? (
            <button
              type="button"
              aria-label="Play"
              onClick={togglePlay}
              className="absolute inset-0 grid place-items-center bg-black/20 transition-colors hover:bg-black/35"
            >
              <span className="flex size-16 items-center justify-center rounded-full border border-white/40 bg-black/40 backdrop-blur-sm">
                <Play className="ml-1 size-8 text-white" fill="currentColor" />
              </span>
            </button>
          ) : null}

          {!isProcessed ? (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[11px] text-white/90 backdrop-blur">
              {status === "failed" ? (
                <TriangleAlert className="size-3 text-destructive" />
              ) : (
                <Loader2 className="size-3 animate-spin" />
              )}
              {status === "failed"
                ? "Processing failed — playing raw file"
                : status === "queued"
                  ? "Queued for processing — playing raw file"
                  : "Processing — playing raw file"}
            </span>
          ) : null}

          {isProcessed && failed ? (
            <div className="absolute inset-0 grid place-items-center bg-black/60 p-4">
              <p className="inline-flex items-center gap-2 text-white">
                <TriangleAlert className="size-5 text-destructive" />
                Playback failed
              </p>
            </div>
          ) : null}

          <div
            className={cn(
              "absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/85 to-transparent px-3 pt-10 pb-2 transition-opacity duration-200",
              controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            <div className="flex items-center gap-2 text-white">
              <button
                type="button"
                className={ctrlBtn}
                aria-label={playing ? "Pause" : "Play"}
                onClick={togglePlay}
              >
                {playing ? (
                  <Pause className="size-4" fill="currentColor" />
                ) : (
                  <Play className="size-4" fill="currentColor" />
                )}
              </button>

              <span className="text-xs tabular-nums text-white/80">
                {fmt(progress)}
              </span>

              <input
                type="range"
                className="range mx-1 h-1.5 flex-1"
                min={0}
                max={maxProgress || 1}
                step={0.1}
                value={progress}
                style={fill(progress, maxProgress)}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="Seek"
              />

              <span className="hidden text-xs tabular-nums text-white/80 sm:inline">
                {fmt(maxProgress)}
              </span>

              <button
                type="button"
                className={ctrlBtn}
                aria-label={muted ? "Unmute" : "Mute"}
                onClick={toggleMute}
              >
                {muted || volPct === 0 ? (
                  <VolumeX className="size-4" />
                ) : (
                  <Volume2 className="size-4" />
                )}
              </button>

              <input
                type="range"
                className="range hidden h-1.5 w-20 sm:block"
                min={0}
                max={100}
                value={volPct}
                style={fill(volPct, 100)}
                onChange={(e) => changeVolume(Number(e.target.value))}
                aria-label="Volume"
              />

              <div className="relative">
                <button
                  type="button"
                  className={ctrlBtn}
                  aria-label="Playback speed"
                  onClick={() => {
                    setShowSpeed((v) => !v);
                    setShowQuality(false);
                  }}
                >
                  <span className="text-xs font-medium tabular-nums">
                    {speed}x
                  </span>
                </button>
                {showSpeed ? (
                  <div className="absolute right-0 bottom-full z-10 mb-1 flex min-w-24 flex-col rounded-md border border-border bg-card p-1 shadow-lg">
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => selectSpeed(s)}
                        className={cn(
                          "rounded px-2 py-1 text-xs transition-colors hover:bg-accent",
                          s === speed && "text-primary"
                        )}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {hasVariants ? (
                <div className="relative">
                  <button
                    type="button"
                    className={ctrlBtn}
                    aria-label="Quality"
                    onClick={() => {
                      setShowQuality((v) => !v);
                      setShowSpeed(false);
                    }}
                  >
                    <span className="text-xs font-medium tabular-nums">
                      {quality === -1
                        ? "Auto"
                        : `${levels[quality]?.height || ""}p`}
                    </span>
                  </button>
                  {showQuality ? (
                    <div className="absolute right-0 bottom-full z-10 mb-1 flex min-w-24 flex-col rounded-md border border-border bg-card p-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => selectQuality(-1)}
                        className={cn(
                          "rounded px-2 py-1 text-xs transition-colors hover:bg-accent",
                          quality === -1 && "text-primary"
                        )}
                      >
                        Auto
                      </button>
                      {[...levels]
                        .sort((a, b) => (b.height || 0) - (a.height || 0))
                        .map((level, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectQuality(idx)}
                            className={cn(
                              "rounded px-2 py-1 text-xs transition-colors hover:bg-accent",
                              quality === idx && "text-primary"
                            )}
                          >
                            {level.height || 0}p
                          </button>
                        ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {pipSupported ? (
                <button
                  type="button"
                  className={ctrlBtn}
                  aria-label="Picture in picture"
                  onClick={togglePip}
                >
                  <PictureInPicture className="size-4" />
                </button>
              ) : null}

              <button
                type="button"
                className={ctrlBtn}
                aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                onClick={toggleFullscreen}
              >
                {fullscreen ? (
                  <Minimize className="size-4" />
                ) : (
                  <Maximize className="size-4" />
                )}
              </button>
            </div>
          </div>
        </>
    </div>
  );
}