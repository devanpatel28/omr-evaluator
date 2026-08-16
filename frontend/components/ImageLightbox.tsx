"use client";
import { useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

/**
 * Fullscreen image lightbox overlay.
 * Click anywhere or press Escape to close.
 */
export default function ImageLightbox({ src, alt = "Preview", onClose }: ImageLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll while lightbox is open
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="lightbox-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="lightbox-close"
        aria-label="Close preview"
      >
        <X size={20} />
      </button>

      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="lightbox-image"
        onClick={(e) => e.stopPropagation()}
      />

      <style>{`
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: zoom-out;
          animation: lightboxFadeIn 0.2s ease-out;
        }

        .lightbox-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.15);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
          z-index: 10000;
        }
        .lightbox-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .lightbox-image {
          max-width: 95vw;
          max-height: 95vh;
          object-fit: contain;
          border-radius: 8px;
          cursor: default;
          animation: lightboxZoomIn 0.25s ease-out;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
        }

        @keyframes lightboxFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes lightboxZoomIn {
          from { transform: scale(0.92); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
