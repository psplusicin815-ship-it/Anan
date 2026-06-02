/**
 * Main App
 */

import React from 'react';
import { Provider } from 'react-redux';
import { createRoot } from 'react-dom/client';
import { IconContext } from 'react-icons';
import { useSelector } from 'react-redux';

import Style from './Style';
import CoordinatesBox from './CoordinatesBox';
import CanvasSwitchButton from './buttons/CanvasSwitchButton';
import OnlineBox from './OnlineBox';
import ChatButton from './buttons/ChatButton';
import Menu from './Menu';
import UI from './UI';
import ExpandMenuButton from './buttons/ExpandMenuButton';
import WindowManager from './WindowManager';
import PencilButton from './buttons/PencilButton';
import OverlayButton from './buttons/OverlayButton';
import OverlayPanel from './OverlayPanel';
import OverlayCanvas from '../ui/OverlayCanvas';

const iconContextValue = { style: { verticalAlign: 'middle' } };

const OverlayPanelWrapper = () => {
  const open = useSelector((s) => s.gui.overlayPanelOpen);
  return open ? <OverlayPanel /> : null;
};

const App = () => (
  <>
    <Style />
    <IconContext.Provider value={iconContextValue}>
      <CanvasSwitchButton />
      <Menu />
      <ChatButton />
      <OnlineBox />
      <CoordinatesBox />
      <ExpandMenuButton />
      <PencilButton />
      <OverlayButton />
      <OverlayCanvas />
      <OverlayPanelWrapper />
      <UI />
      <WindowManager />
    </IconContext.Provider>
  </>
);

function renderApp(domParent, store) {
  const root = createRoot(domParent);
  root.render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
}

export default renderApp;
