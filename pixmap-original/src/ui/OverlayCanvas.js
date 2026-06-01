/*
 * Overlay rendering: image overlay + ghost pencil pixels
 * Runs its own rAF loop so rendering stays smooth during pan/zoom
 */

import React, { useRef, useEffect } from 'react';
import { useStore } from 'react-redux';

const OverlayCanvas = () => {
  const canvasRef = useRef(null);
  const store = useStore();

  // resize canvas to match viewport
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // render loop
  useEffect(() => {
    let animId;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let lastImgSrc = null;

    const draw = () => {
      animId = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const state = store.getState();
      const {
        overlayEnabled,
        overlayImage,
        overlayOpacity,
        overlayPos,
        overlayGhostPixels,
      } = state.gui;

      const hasGhost = overlayGhostPixels && overlayGhostPixels.length > 0;

      if (!overlayEnabled && !hasGhost) {
        // nothing to draw – clear once then skip
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const { view, viewscale, palette } = state.canvas;
      if (!view) return;
      const [viewX, viewY] = view;
      const w = canvas.width;
      const h = canvas.height;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);

      // ---- image overlay ----
      if (overlayEnabled && overlayImage) {
        if (overlayImage !== lastImgSrc) {
          img.src = overlayImage;
          lastImgSrc = overlayImage;
        }
        if (img.complete && img.naturalWidth > 0) {
          const [ox, oy] = overlayPos;
          const sx = Math.round((ox - viewX) * viewscale + w / 2);
          const sy = Math.round((oy - viewY) * viewscale + h / 2);
          const sw = Math.round(img.naturalWidth * viewscale);
          const sh = Math.round(img.naturalHeight * viewscale);
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, overlayOpacity));
          ctx.imageSmoothingEnabled = viewscale < 1;
          ctx.drawImage(img, sx, sy, sw, sh);
          ctx.restore();
        }
      }

      // ---- ghost pixels ----
      if (hasGhost && palette) {
        const pixSize = Math.max(1, viewscale);
        ctx.save();
        overlayGhostPixels.forEach(({ x, y, clr }) => {
          const sx = Math.round((x - viewX) * viewscale + w / 2);
          const sy = Math.round((y - viewY) * viewscale + h / 2);
          const color = (palette.colors && palette.colors[clr]) || '#ff00ff';
          // filled ghost pixel
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = color;
          ctx.fillRect(sx, sy, pixSize, pixSize);
          // border for visibility
          if (pixSize >= 4) {
            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(sx + 0.5, sy + 0.5, pixSize - 1, pixSize - 1);
          }
        });
        ctx.restore();
      }
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [store]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default OverlayCanvas;
