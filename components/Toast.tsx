"use client";

import { useEffect, useRef } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  onClose: () => void;
}

export default function Toast({ message, type = "info", onClose }: ToastProps) {
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const toast = toastRef.current;
    if (toast) {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    }
    const timer = setTimeout(() => {
      if (toast && document.body.contains(toast)) {
        onClose();
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="toast-container">
      <div
        ref={toastRef}
        className={`toast toast-${type}`}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div className="toast-body">{message}</div>
        <button type="button" className="close" onClick={onClose} aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </div>
  );
}
