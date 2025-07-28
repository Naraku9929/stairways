export const MODE_STAIRWAY = 'stairway'

export const injectControls = (controls) => {
  // Stairway Layer Tools
  const stairwayControl = {
    name: 'stairway',
    title: 'stairways.ui.controls.group',
    layer: 'stairways',
    icon: 'fas fa-stairs',
    visible: game.user.isGM,
    // Core switched from onClick (<= v12) to onChange (>= v13) for control groups.
    ...(foundry.utils.isNewerVersion ? foundry.utils.isNewerVersion(game.version, '13.0.0') : false ? {
      onChange: (_evt, active) => {
        if (active) foundry.canvas.canvas.stairways?.activate()
      }
    } : {
      onClick: () => foundry.canvas.canvas.stairways?.activate()
    }),
    tools: [
      {
        name: MODE_STAIRWAY,
        title: 'stairways.ui.controls.stairway',
        icon: 'fas fa-building',
        onChange: () => {} // Add a no-op onChange for the primary tool
      },
      {
        name: 'disabled',
        title: 'stairways.ui.controls.disabled',
        icon: 'fas fa-lock',
        toggle: true,
        active: false,
        onChange: toggled => { foundry.canvas.canvas.stairways._disabled = toggled }
      },
      {
        name: 'hidden',
        title: 'stairways.ui.controls.hidden',
        icon: 'fas fa-eye-slash',
        toggle: true,
        active: false,
        onChange: toggled => { foundry.canvas.canvas.stairways._hidden = toggled }
      },
      {
        name: 'animate',
        title: 'stairways.ui.controls.animate',
        icon: 'fas fa-walking',
        toggle: true,
        active: false,
        onChange: toggled => { foundry.canvas.canvas.stairways._animate = toggled }
      },
      {
        name: 'clear',
        title: 'stairways.ui.controls.clear',
        icon: 'fas fa-trash',
        onClick: () => foundry.canvas.canvas.stairways.deleteAll(),
        onChange: () => {}, // Add a no-op onChange for the clear tool
        button: true
      }
    ]
  }

  /*
   * Foundry <= v12 passes the control groups as a plain Array which we can
   * splice.  From v13 onward the parameter is a Collection – it still behaves
   * like a Map and exposes `.set()` but does not implement Array functions
   * such as `findIndex` or `splice`.
   */

  if (Array.isArray(controls)) {
    // Legacy behaviour (Array)
    const idx = controls.findIndex(c => c.name === 'walls')
    const insertAt = idx >= 0 ? idx + 1 : controls.length
    controls.splice(insertAt, 0, stairwayControl)
  } else if (controls && typeof controls.set === 'function') {
    // Foundry v13+ Collection (Map-like)
    controls.set(stairwayControl.name, stairwayControl)
  } else if (typeof controls === 'object') {
    // Plain object – assign property (observed core implementation in v13 pre-release)
    controls[stairwayControl.name] = stairwayControl
  } else if (typeof controls.push === 'function') {
    // Fallback – unknown iterable still supporting push
    controls.push(stairwayControl)
  }
}
