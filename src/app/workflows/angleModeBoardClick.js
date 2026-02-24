export function createAngleModeBoardClickWorkflow(ctx) {
  const { session, ToolMode, statusEl, modeLabel } = ctx;

  function handleAngleModeBoardClick() {
    if (session.currentMode !== ToolMode.ANGLE) {
      return false;
    }

    statusEl.textContent = `Mode: ${modeLabel(session.currentMode)} (select existing points only)`;
    return true;
  }

  return {
    handleAngleModeBoardClick,
  };
}
