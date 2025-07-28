export const MODE_STAIRWAY = "stairway"

export const injectControls = controls => {
  /* --------------------------------------------------------------
   * Build the control-group          (✓ works in v12-v14)
   * ------------------------------------------------------------- */
  const core13 = foundry.utils.isNewerVersion?.(game.version, "13.0.0") ?? false

  const makeTool = (name, title, icon, opts = {}) => ({
    name, title, icon, ...opts
  })

  /** Tools must be an **array** – order defines their position. */
  const tools = [
    makeTool(MODE_STAIRWAY, "stairways.ui.controls.stairway",
             "fa-solid fa-person-walking-arrow-right",
             { button: true }),

    makeTool("disabled", "stairways.ui.controls.disabled", "fa-solid fa-lock", {
      toggle  : true,
      onChange: (_ev, active) => canvas.stairways._disabled = active
    }),

    makeTool("hidden", "stairways.ui.controls.hidden", "fa-solid fa-eye-slash", {
      toggle  : true,
      onChange: (_ev, active) => canvas.stairways._hidden = active
    }),

    makeTool("animate", "stairways.ui.controls.animate", "fa-solid fa-person-running", {
      toggle  : true,
      onChange: (_ev, active) => canvas.stairways._animate = active
    }),

    makeTool("clear", "stairways.ui.controls.clear", "fa-solid fa-trash", {
      button : true,
      onClick: () => canvas.stairways.deleteAll()
    })
  ]

  /** The control group itself */
  const stairwayControl = {
    name      : "stairway",
    title     : "stairways.ui.controls.group",
    layer     : "stairways",
    icon      : "fa-solid fa-person-walking-arrow-right",
    visible   : game.user.isGM,
    tools,
    activeTool: MODE_STAIRWAY,
    ...(core13
      ? { onChange : (_ev, active) => active && canvas.stairways?.activate() }
      : { onClick  : () => canvas.stairways?.activate() })
  }

  /* --------------------------------------------------------------
   * Inject after the Walls control (covers Array, Map, Object)
   * ------------------------------------------------------------- */
  if (Array.isArray(controls)) {
    const idx = controls.findIndex(c => c.name === "walls")
    controls.splice(idx >= 0 ? idx + 1 : controls.length, 0, stairwayControl)

  } else if (controls?.set instanceof Function) {          // Collection (v13+)
    controls.set(stairwayControl.name, stairwayControl)

  } else if (controls && typeof controls === "object") {   // plain object
    controls.stairway = stairwayControl
  }
}
