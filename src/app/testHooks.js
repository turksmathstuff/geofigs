export function installGeoTestHook({ window, store, session, boardController }) {
  if (!new URLSearchParams(window.location.search).has("e2e")) {
    return;
  }

  window.__geoTest = {
    docSnapshot: () => store.snapshot(),
    selectedIds: () => store.selectedIds(),
    mode: () => session.currentMode,
    userToScreen: (x, y) => {
      const board = boardController.board;
      const coords = new window.JXG.Coords(window.JXG.COORDS_BY_USER, [x, y], board);
      const rect = board.containerObj.getBoundingClientRect();
      return { x: rect.left + coords.scrCoords[1], y: rect.top + coords.scrCoords[2] };
    },
  };
}
