"use client";

import { useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";

interface VideoPlayerProps {
  video: {
    id: number;
    filename?: string;
    filepath?: string;
    status?: string;
    url?: string;
  };
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>(null);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const updateSliderBg = (slider: HTMLInputElement) => {
    const pct = ((Number(slider.value) - Number(slider.min)) / (Number(slider.max) - Number(slider.min))) * 100;
    slider.style.background = `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${pct}%,rgba(255, 255, 255, 0.4) ${pct}%, rgba(255, 255, 255, 0.4) 100%)`;
  };

  const showControls = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    c.classList.remove("hide-controls");
    c.classList.add("show-controls");
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (videoRef.current && !videoRef.current.paused) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (videoRef.current && !videoRef.current.paused && !c.matches(":hover")) {
          c.classList.remove("show-controls");
          c.classList.add("hide-controls");
        }
      }, 3000);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const videoEl = videoRef.current;
    if (!container || !videoEl) return;

    const url = video.url;
    const status = video.status;

    const playOverlay = container.querySelector(".play-overlay") as HTMLElement;
    const playPauseBtn = container.querySelector(".play-pause-btn") as HTMLElement;
    const playPauseIcon = playPauseBtn?.querySelector(".play-icon") as HTMLImageElement;
    const progressBar = container.querySelector(".progress-bar") as HTMLInputElement;
    const currentTimeDisplay = container.querySelector(".current-time-display") as HTMLElement;
    const durationDisplay = container.querySelector(".duration-display") as HTMLElement;
    const muteBtn = container.querySelector(".mute-btn") as HTMLElement;
    const volumeIcon = muteBtn?.querySelector(".volume-icon") as HTMLImageElement;
    const volumeSlider = container.querySelector(".volume-slider") as HTMLInputElement;
    const fullscreenBtn = container.querySelector(".fullscreen-btn") as HTMLElement;
    const fullscreenIcon = fullscreenBtn?.querySelector(".fullscreen-icon") as HTMLImageElement;
    const qualityBtn = container.querySelector(".quality-btn") as HTMLElement;
    const qualityOptionsUl = container.querySelector(".quality-options") as HTMLUListElement;
    const speedBtn = container.querySelector(".speed-btn") as HTMLElement;
    const speedOptionsUl = container.querySelector(".speed-options") as HTMLUListElement;
    const pipBtn = container.querySelector(".pip-btn") as HTMLElement;

    let currentQualityLevel = -1;

    const togglePlay = () => {
      if (videoEl.paused || videoEl.ended) {
        const promise = videoEl.play();
        if (promise !== undefined) {
          promise.catch(() => {});
        }
      } else {
        videoEl.pause();
      }
    };

    const updatePlayBtn = () => {
      if (!playPauseIcon) return;
      if (videoEl.paused || videoEl.ended) {
        playPauseIcon.src = "/static/svg/play.svg";
        playOverlay?.classList.remove("hidden");
        container.classList.remove("playing");
        container.classList.add("paused");
        showControls();
      } else {
        playPauseIcon.src = "/static/svg/pause.svg";
        playOverlay?.classList.add("hidden");
        container.classList.add("playing");
        container.classList.remove("paused");
        showControls();
      }
    };

    const updateProgress = () => {
      if (!progressBar || !currentTimeDisplay) return;
      progressBar.value = String((videoEl.currentTime / videoEl.duration) * 100);
      currentTimeDisplay.textContent = formatTime(videoEl.currentTime);
      updateSliderBg(progressBar);
    };

    const seekVideo = () => {
      if (!progressBar) return;
      videoEl.currentTime = (Number(progressBar.value) / 100) * videoEl.duration;
    };

    const toggleMute = () => {
      videoEl.muted = !videoEl.muted;
      if (videoEl.muted || videoEl.volume === 0) {
        volumeIcon.src = "/static/svg/volume-mute.svg";
      } else {
        volumeIcon.src = "/static/svg/volume-up.svg";
      }
      if (volumeSlider) {
        volumeSlider.value = String(videoEl.muted ? 0 : videoEl.volume * 100);
        updateSliderBg(volumeSlider);
      }
    };

    const changeVolume = () => {
      if (!volumeSlider) return;
      videoEl.volume = Number(volumeSlider.value) / 100;
      videoEl.muted = videoEl.volume === 0;
      if (videoEl.muted || videoEl.volume === 0) {
        volumeIcon.src = "/static/svg/volume-mute.svg";
      } else {
        volumeIcon.src = "/static/svg/volume-up.svg";
      }
      updateSliderBg(volumeSlider);
    };

    const buildQualityOptions = (levels: Array<{ height?: number }>) => {
      if (!qualityOptionsUl) return;
      qualityOptionsUl.innerHTML = "";
      const autoLi = document.createElement("li");
      autoLi.textContent = "Auto";
      autoLi.dataset.level = "-1";
      if (currentQualityLevel === -1) autoLi.classList.add("active");
      autoLi.addEventListener("click", () => selectQuality(-1));
      qualityOptionsUl.appendChild(autoLi);

      [...levels].sort((a, b) => (b.height || 0) - (a.height || 0)).forEach((level, idx) => {
        const li = document.createElement("li");
        li.textContent = `${level.height || 0}p`;
        li.dataset.level = String(idx);
        if (currentQualityLevel === idx) li.classList.add("active");
        li.addEventListener("click", () => selectQuality(idx));
        qualityOptionsUl.appendChild(li);
      });
    };

    const selectQuality = (levelIdx: number) => {
      if (hlsRef.current) {
        hlsRef.current.currentLevel = levelIdx;
        currentQualityLevel = levelIdx;
        qualityOptionsUl?.querySelectorAll("li").forEach((li) => {
          li.classList.remove("active");
          if (Number(li.dataset.level) === levelIdx) li.classList.add("active");
        });
      }
      qualityOptionsUl?.classList.remove("active");
    };

    // HLS initialization
    if (url && status === "processed" && Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        if (data.levels && data.levels.length > 1) {
          buildQualityOptions(data.levels);
          if (qualityBtn) qualityBtn.style.display = "";
        } else {
          if (qualityBtn) qualityBtn.style.display = "none";
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        currentQualityLevel = data.level;
        qualityOptionsUl?.querySelectorAll("li").forEach((li) => {
          li.classList.remove("active");
          if (Number(li.dataset.level) === data.level) li.classList.add("active");
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error("HLS fatal network error:", data);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else if (url) {
      videoEl.src = url;
      videoEl.load();
      if (qualityBtn) qualityBtn.style.display = "none";
    }

    const ac = new AbortController();
    const opt = { signal: ac.signal };

    playOverlay?.addEventListener("click", togglePlay, opt);
    playPauseBtn?.addEventListener("click", togglePlay, opt);
    videoEl.addEventListener("click", togglePlay, opt);
    videoEl.addEventListener("play", updatePlayBtn, opt);
    videoEl.addEventListener("pause", updatePlayBtn, opt);
    videoEl.addEventListener("ended", updatePlayBtn, opt);
    videoEl.addEventListener("timeupdate", updateProgress, opt);

    videoEl.addEventListener("loadedmetadata", () => {
      if (durationDisplay) durationDisplay.textContent = formatTime(videoEl.duration);
      if (progressBar) {
        progressBar.max = "100";
        progressBar.value = "0";
        updateSliderBg(progressBar);
      }
      if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(0);
      updatePlayBtn();
      if (volumeSlider) {
        volumeSlider.value = String(videoEl.volume * 100);
        updateSliderBg(volumeSlider);
      }
      videoEl.playbackRate = 1;
    }, opt);

    progressBar?.addEventListener("input", seekVideo, opt);
    muteBtn?.addEventListener("click", toggleMute, opt);
    volumeSlider?.addEventListener("input", changeVolume, opt);
    videoEl.addEventListener("volumechange", () => {
      if (videoEl.muted || videoEl.volume === 0) {
        volumeIcon.src = "/static/svg/volume-mute.svg";
      } else {
        volumeIcon.src = "/static/svg/volume-up.svg";
      }
    }, opt);

    fullscreenBtn?.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen();
      }
    }, opt);

    const updateFS = () => {
      if (!fullscreenIcon) return;
      if (document.fullscreenElement === container) {
        fullscreenIcon.src = "/static/svg/fullscreen-exit.svg";
        container.classList.add("fullscreen");
      } else {
        fullscreenIcon.src = "/static/svg/fullscreen.svg";
        container.classList.remove("fullscreen");
      }
    };
    document.addEventListener("fullscreenchange", updateFS, opt);

    qualityBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      qualityOptionsUl?.classList.toggle("active");
      speedOptionsUl?.classList.remove("active");
    }, opt);

    speedBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      speedOptionsUl?.classList.toggle("active");
      qualityOptionsUl?.classList.remove("active");
    }, opt);

    speedOptionsUl?.querySelectorAll("li").forEach((li) => {
      li.addEventListener("click", () => {
        const speed = Number(li.dataset.speed);
        videoEl.playbackRate = speed;
        speedBtn.textContent = `${speed}x`;
        speedOptionsUl.querySelectorAll("li").forEach((l) => {
          l.classList.remove("active");
          if (Number(l.dataset.speed) === speed) l.classList.add("active");
        });
        speedOptionsUl.classList.remove("active");
      }, opt);
    });

    if (pipBtn && document.pictureInPictureEnabled) {
      pipBtn.addEventListener("click", () => {
        if (document.pictureInPictureElement) document.exitPictureInPicture();
        else videoEl.requestPictureInPicture();
      }, opt);
    } else if (pipBtn) {
      pipBtn.style.display = "none";
    }

    document.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (!qualityOptionsUl?.contains(t) && t !== qualityBtn) qualityOptionsUl?.classList.remove("active");
      if (!speedOptionsUl?.contains(t) && t !== speedBtn) speedOptionsUl?.classList.remove("active");
    }, opt);

    container.addEventListener("mouseenter", showControls, opt);
    container.addEventListener("mousemove", showControls, opt);
    container.addEventListener("mouseleave", () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (videoRef.current && !videoRef.current.paused) {
        controlsTimeoutRef.current = setTimeout(() => {
          container.classList.remove("show-controls");
          container.classList.add("hide-controls");
        }, 3000);
      }
    }, opt);

    return () => {
      ac.abort();
      hlsRef.current?.destroy();
    };
  }, [video, showControls]);

  return (
    <div className="video-container" data-id={video.id} ref={containerRef}>
      <div className="play-overlay">
        <img src="/static/svg/play.svg" alt="Play" className="play-overlay-icon" />
      </div>
      <video
        ref={videoRef}
        id={`videoPlayer${video.id}`}
        className="video-player"
        preload="auto"
        data-id={video.id}
        data-filename={video.filename}
        data-filepath={video.filepath}
        data-status={video.status}
        data-url={video.url}
        playsInline
        crossOrigin="anonymous"
      />
      <div className="controls-overlay">
        <div className="controls-bar">
          <button className="play-pause-btn" aria-label="Play/Pause">
            <img src="/static/svg/play.svg" alt="Play" className="play-icon" />
          </button>
          <div className="progress-bar-container">
            <input type="range" className="progress-bar" defaultValue="0" min="0" max="100" step="0.1" />
            <div className="time-display">
              <span className="current-time-display">00:00</span> / <span className="duration-display">00:00</span>
            </div>
          </div>
          <div className="volume-container">
            <button className="mute-btn" aria-label="Mute/Unmute">
              <img src="/static/svg/volume-up.svg" alt="Volume" className="volume-icon" />
            </button>
            <input type="range" className="volume-slider" defaultValue="100" min="0" max="100" />
          </div>
          <div className="playback-speed-selector">
            <button className="speed-btn">1x</button>
            <ul className="speed-options">
              <li data-speed="0.5">0.5x</li>
              <li data-speed="0.75">0.75x</li>
              <li data-speed="1">1x</li>
              <li data-speed="1.25">1.25x</li>
              <li data-speed="1.5">1.5x</li>
              <li data-speed="2">2x</li>
            </ul>
          </div>
          <div className="quality-selector-container">
            <button className="quality-btn" aria-label="Quality">
              <img src="/static/svg/gear.svg" alt="Quality" className="quality-icon" />
            </button>
            <ul className="quality-options" />
          </div>
          <button className="pip-btn" aria-label="Picture-in-Picture">
            <img src="/static/svg/pip.svg" alt="PiP" className="pip-icon" />
          </button>
          <button className="fullscreen-btn" aria-label="Fullscreen">
            <img src="/static/svg/fullscreen.svg" alt="Fullscreen" className="fullscreen-icon" />
          </button>
        </div>
      </div>
    </div>
  );
}
