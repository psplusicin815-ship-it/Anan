const initialState = {
  showGrid: false,
  showPixelNotify: false,
  autoZoomIn: false,
  isPotato: false,
  isLightGrid: false,
  compactPalette: false,
  paletteOpen: true,
  mute: false,
  chatNotify: true,
  // top-left button menu
  menuOpen: false,
  // show online users per canvas instead of total
  onlineCanvas: false,
  // selected theme
  style: 'default',
  // pencil
  pencilTool: false,
  // overlay image
  overlayEnabled: false,
  overlayImage: null,
  overlayOpacity: 0.5,
  overlayPos: [0, 0],
  // overlay ghost pencil
  overlayPencilEnabled: false,
  overlayGhostPixels: [],
  // overlay panel open/close
  overlayPanelOpen: false,
};


export default function gui(
  state = initialState,
  action,
) {
  switch (action.type) {
    case 's/TGL_GRID': {
      return {
        ...state,
        showGrid: !state.showGrid,
      };
    }

    case 's/TGL_PXL_NOTIFY': {
      return {
        ...state,
        showPixelNotify: !state.showPixelNotify,
      };
    }

    case 's/TGL_AUTO_ZOOM_IN': {
      return {
        ...state,
        autoZoomIn: !state.autoZoomIn,
      };
    }

    case 's/TGL_ONLINE_CANVAS': {
      return {
        ...state,
        onlineCanvas: !state.onlineCanvas,
      };
    }

    case 's/TGL_POTATO_MODE': {
      return {
        ...state,
        isPotato: !state.isPotato,
      };
    }

    case 's/TGL_LIGHT_GRID': {
      return {
        ...state,
        isLightGrid: !state.isLightGrid,
      };
    }

    case 's/TGL_COMPACT_PALETTE': {
      return {
        ...state,
        compactPalette: !state.compactPalette,
      };
    }

    case 's/TGL_OPEN_PALETTE': {
      return {
        ...state,
        paletteOpen: !state.paletteOpen,
      };
    }

    case 's/TGL_OPEN_MENU': {
      return {
        ...state,
        menuOpen: !state.menuOpen,
      };
    }

    case 's/SELECT_STYLE': {
      const { style } = action;
      return {
        ...state,
        style,
      };
    }

    case 'SELECT_COLOR': {
      const {
        compactPalette,
      } = state;
      let {
        paletteOpen,
      } = state;
      if (compactPalette || window.innerWidth < 300) {
        paletteOpen = false;
      }
      return {
        ...state,
        paletteOpen,
      };
    }

    case 's/TGL_MUTE':
      return {
        ...state,
        mute: !state.mute,
      };

    case 's/TGL_CHAT_NOTIFY':
      return {
        ...state,
        chatNotify: !state.chatNotify,
      };

    case 's/TGL_PENCILTOOL':
      return {
        ...state,
        pencilTool: !state.pencilTool,
      };

    case 's/TGL_OVERLAY':
      return { ...state, overlayEnabled: !state.overlayEnabled };

    case 's/SET_OVERLAY_IMAGE':
      return { ...state, overlayImage: action.url };

    case 's/SET_OVERLAY_OPACITY':
      return { ...state, overlayOpacity: action.opacity };

    case 's/SET_OVERLAY_POS':
      return { ...state, overlayPos: action.pos };

    case 's/TGL_OVERLAY_PENCIL':
      return { ...state, overlayPencilEnabled: !state.overlayPencilEnabled };

    case 's/ADD_GHOST_PIXEL': {
      const existing = state.overlayGhostPixels.findIndex(
        (p) => p.x === action.x && p.y === action.y,
      );
      if (existing !== -1) {
        const updated = [...state.overlayGhostPixels];
        updated[existing] = { x: action.x, y: action.y, clr: action.clr };
        return { ...state, overlayGhostPixels: updated };
      }
      return {
        ...state,
        overlayGhostPixels: [
          ...state.overlayGhostPixels,
          { x: action.x, y: action.y, clr: action.clr },
        ],
      };
    }

    case 's/REMOVE_GHOST_PIXEL':
      return {
        ...state,
        overlayGhostPixels: state.overlayGhostPixels.filter(
          (p) => !(p.x === action.x && p.y === action.y),
        ),
      };

    case 's/CLEAR_GHOST_PIXELS':
      return { ...state, overlayGhostPixels: [] };

    case 's/TGL_OVERLAY_PANEL':
      return { ...state, overlayPanelOpen: !state.overlayPanelOpen };

    default:
      return state;
  }
}
