import { SETTINGS_KEY } from './settings.js'

const CURRENT_VERSION = '0.7.1'

export const performMigrations = async () => {
  // only run migrations as GM
  if (!game.user.isGM) {
    return
  }

  // data version
  const dataVersion = game.settings.get(SETTINGS_KEY, 'dataVersion')

  // set data version on first install
  if (dataVersion === 'fresh install') {
    await setCurrentVersion()
  } else if (dataVersion === '0.3.0') {
    await updateDataSchema()
  }
}

const setCurrentVersion = async () => {
  await game.settings.set(SETTINGS_KEY, 'dataVersion', CURRENT_VERSION)
}

const updateDataSchema = async () => {
  const sceneErrors = []

  // make sure required fields are present
  for (const scene of game.scenes) {
    const stairways = foundry.utils.duplicate(scene.flags.stairways || [])

    for (const stairway of stairways) {
      const errors = []

      // document id is required
      if (typeof stairway._id !== 'string') {
        stairway._id = foundry.utils.randomID(16)
        errors.push('_id')
      }

      // name is required
      if (typeof stairway.name !== 'string') {
        stairway.name = 'sw-' + foundry.utils.randomID(8)
        errors.push('name')
      }

      // position must be a number
      if (typeof stairway.x !== 'number') {
        stairway.x = 0
        errors.push('x')
      }
      if (typeof stairway.y !== 'number') {
        stairway.y = 0
        errors.push('y')
      }

      // log errors
      if (errors.length > 0) {
        sceneErrors.push(scene.id)
        console.error('Invalid stairway data detected!')
        console.log(errors, stairway, scene)
      }
    }

    // update data when fixed
    if (sceneErrors.includes(scene.id)) {
      await scene.update({ 'flags.stairways': stairways })
    }
  }

  await setCurrentVersion()

  // reload page when data was fixed
  if (sceneErrors.length > 0) {
    window.location.reload()
  }
}
