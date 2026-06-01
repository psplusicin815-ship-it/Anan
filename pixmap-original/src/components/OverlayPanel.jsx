/*
 * Overlay & Ghost Pencil settings panel
 */

import React, { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MdClose, MdLayers, MdDelete } from 'react-icons/md';
import { BsFillPencilFill, BsPencil } from 'react-icons/bs';
import { t } from 'ttag';

import {
  toggleOverlay,
  setOverlayImage,
  setOverlayOpacity,
  setOverlayPos,
  toggleOverlayPencil,
  clearGhostPixels,
  toggleOverlayPanel,
} from '../store/actions';

const OverlayPanel = () => {
  const dispatch = useDispatch();

  const overlayEnabled = useSelector((s) => s.gui.overlayEnabled);
  const overlayImage = useSelector((s) => s.gui.overlayImage);
  const overlayOpacity = useSelector((s) => s.gui.overlayOpacity);
  const overlayPos = useSelector((s) => s.gui.overlayPos);
  const overlayPencilEnabled = useSelector((s) => s.gui.overlayPencilEnabled);
  const ghostCount = useSelector((s) => s.gui.overlayGhostPixels.length);
  const view = useSelector((s) => s.canvas.view);

  const [urlInput, setUrlInput] = useState(overlayImage || '');

  const applyUrl = useCallback(() => {
    if (urlInput.trim()) {
      dispatch(setOverlayImage(urlInput.trim()));
    }
  }, [urlInput, dispatch]);

  const handleFile = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      dispatch(setOverlayImage(ev.target.result));
      setUrlInput('(local file)');
    };
    reader.readAsDataURL(file);
  }, [dispatch]);

  const snapToView = useCallback(() => {
    dispatch(setOverlayPos([Math.round(view[0]), Math.round(view[1])]));
  }, [view, dispatch]);

  const handlePosX = useCallback((e) => {
    const v = parseInt(e.target.value, 10);
    if (!Number.isNaN(v)) dispatch(setOverlayPos([v, overlayPos[1]]));
  }, [overlayPos, dispatch]);

  const handlePosY = useCallback((e) => {
    const v = parseInt(e.target.value, 10);
    if (!Number.isNaN(v)) dispatch(setOverlayPos([overlayPos[0], v]));
  }, [overlayPos, dispatch]);

  return (
    <div id="overlaypanel">
      <div className="overlaypanel-header">
        <MdLayers style={{ marginRight: 6 }} />
        <span>{t`Overlay`}</span>
        <div
          className="overlaypanel-close"
          role="button"
          tabIndex={-1}
          onClick={() => dispatch(toggleOverlayPanel())}
        >
          <MdClose />
        </div>
      </div>

      {/* --- IMAGE OVERLAY --- */}
      <div className="overlaypanel-section">
        <div className="overlaypanel-row">
          <strong>{t`Image Overlay`}</strong>
          <label className="overlaypanel-toggle">
            <input
              type="checkbox"
              checked={overlayEnabled}
              onChange={() => dispatch(toggleOverlay())}
            />
            <span className={overlayEnabled ? 'overlaypanel-pill on' : 'overlaypanel-pill'}>
              {overlayEnabled ? t`ON` : t`OFF`}
            </span>
          </label>
        </div>

        <div className="overlaypanel-row">
          <input
            type="text"
            className="overlaypanel-input"
            placeholder={t`Image URL…`}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyUrl(); }}
          />
          <button type="button" className="overlaypanel-btn" onClick={applyUrl}>
            {t`Set`}
          </button>
        </div>

        <div className="overlaypanel-row">
          <label className="overlaypanel-filelabel">
            📂 {t`Upload file`}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
          </label>
        </div>

        <div className="overlaypanel-row">
          <span>{t`Opacity`}: {Math.round(overlayOpacity * 100)}%</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={overlayOpacity}
            onChange={(e) => dispatch(setOverlayOpacity(parseFloat(e.target.value)))}
            style={{ flex: 1, marginLeft: 8 }}
          />
        </div>

        <div className="overlaypanel-row">
          <span>X:</span>
          <input
            type="number"
            className="overlaypanel-coord"
            value={overlayPos[0]}
            onChange={handlePosX}
          />
          <span style={{ marginLeft: 6 }}>Y:</span>
          <input
            type="number"
            className="overlaypanel-coord"
            value={overlayPos[1]}
            onChange={handlePosY}
          />
          <button
            type="button"
            className="overlaypanel-btn"
            style={{ marginLeft: 6 }}
            onClick={snapToView}
            title={t`Snap to current view center`}
          >
            📍
          </button>
        </div>
      </div>

      {/* --- GHOST PENCIL --- */}
      <div className="overlaypanel-section">
        <div className="overlaypanel-row">
          <strong>{t`Ghost Pencil`}</strong>
          <label className="overlaypanel-toggle">
            <input
              type="checkbox"
              checked={overlayPencilEnabled}
              onChange={() => dispatch(toggleOverlayPencil())}
            />
            <span className={overlayPencilEnabled ? 'overlaypanel-pill on' : 'overlaypanel-pill'}>
              {overlayPencilEnabled ? <BsFillPencilFill /> : <BsPencil />}
              {' '}
              {overlayPencilEnabled ? t`Active` : t`Off`}
            </span>
          </label>
        </div>

        <div className="overlaypanel-row" style={{ fontSize: 12, color: '#555' }}>
          {overlayPencilEnabled
            ? t`Click/drag to draw ghost pixels (not placed on server)`
            : t`Enable to plan pixels without placing them`}
        </div>

        <div className="overlaypanel-row">
          <span style={{ fontSize: 12 }}>
            {t`Ghost pixels`}: <strong>{ghostCount}</strong>
          </span>
          {ghostCount > 0 && (
            <button
              type="button"
              className="overlaypanel-btn danger"
              onClick={() => dispatch(clearGhostPixels())}
              title={t`Clear all ghost pixels`}
            >
              <MdDelete /> {t`Clear`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(OverlayPanel);
