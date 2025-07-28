export const MODE_STAIRWAY = 'stairway'

export const injectControls = (controls) => {
  // Convert controls object to array
  const controlsArray = Object.values(controls)
  
  if (!Array.isArray(controlsArray) || controlsArray.length === 0) {
    console.warn("Stairways: No valid controls available to inject into", controls)
    return
  }

  // Stairway Layer Tools
  const stairwayControl = {
    name: 'stairway',
    title: 'stairways.ui.controls.group',
    layer: 'stairways',
    icon: 'far fa-building',
    visible: game.user.isGM,
    tools: [
      {
        name: MODE_STAIRWAY,
        title: 'stairways.ui.controls.stairway',
        icon: 'fas fa-building'
      },
      {
        name: 'disabled',
        title: 'stairways.ui.controls.disabled',
        icon: 'fas fa-lock',
        toggle: true,
        active: !!canvas?.stairways?._disabled,
        onClick: toggled => { canvas.stairways._disabled = toggled }
      },
      {
        name: 'hidden',
        title: 'stairways.ui.controls.hidden',
        icon: 'fas fa-eye-slash',
        toggle: true,
        active: !!canvas?.stairways?._hidden,
        onClick: toggled => { canvas.stairways._hidden = toggled }
      },
      {
        name: 'animate',
        title: 'stairways.ui.controls.animate',
        icon: 'fas fa-walking',
        toggle: true,
        active: !!canvas?.stairways?._animate,
        onClick: toggled => { canvas.stairways._animate = toggled }
      },
      {
        name: 'clear',
        title: 'stairways.ui.controls.clear',
        icon: 'fas fa-trash',
        onClick: () => canvas.stairways.deleteAll(),
        button: true
      }
    ],
    activeTool: 'stairway'
  }

  controlsArray.splice(controlsArray.findIndex(e => e.name === 'walls') + 1, 0, stairwayControl)
}
