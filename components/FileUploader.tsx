"use client";

import { useState, useRef, DragEvent } from "react";

interface FileUploaderProps {
  accept: string;
  type: "image" | "video";
  currentUrl?: string;
  onFileChange: (file: File | null) => void;
}

export default function FileUploader({ accept, type, currentUrl, onFileChange }: FileUploaderProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (file) {
      setFileName(file.name);
      onFileChange(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith(`${type}/`)) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const label = type === "image" ? "Image" : "Video";
  const id = type === "image" ? "image" : "video";
  const placeholderId = `placeholder${label}`;

  return (
    <div>
      {currentUrl && type === "image" && (
        <>
          <p>Current Image:</p>
          <img src={currentUrl} alt="Current" style={{ maxWidth: 200, height: "auto", marginBottom: 10 }} />
        </>
      )}
      <div
        className={`upload-box form-file-input ${isDragging ? "dragover" : ""}`}
        id={`uploadBox${label}`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <h2 className="uploader-title">Upload {label}</h2>
        <p id={placeholderId}>{fileName ? `Selected: ${fileName}` : `Drag & Drop ${label.toLowerCase()} file here or click to select`}</p>
        <input
          ref={inputRef}
          className="fileinput"
          type="file"
          id={id}
          name={id}
          accept={accept}
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
}
