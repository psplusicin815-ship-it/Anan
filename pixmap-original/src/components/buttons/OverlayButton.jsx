/*
 * Overlay & Ghost Pencil toggle button
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MdLayers, MdLayersClear } from 'react-icons/md';
import { t } from 'ttag';

import { toggleOverlayPanel } from '../../store/actions';

const OverlayButton = () => {
  const panelOpen = useSelector((state) => state.gui.overlayPanelOpen);
  const overlayEnabled = useSelector((state) => state.gui.overlayEnabled);
  const overlayPencilEnabled = useSelector((state) => state.gui.overlayPencilEnabled);
  const dispatch = useDispatch();
  const isActive = overlayEnabled || overlayPencilEnabled || panelOpen;

  return (
    <div
      id="overlaybutton"
      className={isActive ? 'actionbuttons overlaybuttonON' : 'actionbuttons'}
      role="button"
      title={t`Overlay & Ghost Pencil`}
      tabIndex={-1}
      onClick={() => dispatch(toggleOverlayPanel())}
    >
      {isActive ? <MdLayers /> : <MdLayersClear />}
    </div>
  );
};

export default React.memo(OverlayButton);
