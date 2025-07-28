export const GMs = () => {
  return [...game.users.values()].filter((u) => u.active && u.isGM).sort((a, b) => a.id > b.id)
}

const isFirstGM = () => {
  return GMs().findIndex((u) => u.id === game.userId) === 0
}

export const handleTeleportRequestGM = async (data) => {
  const { sourceSceneId, selectedTokenIds, targetSceneId, targetData, userId } = data

  // ignore teleport requests if not GM
  if (!isFirstGM()) {
    return
  }

  // find scenes
  const sourceScene = game.scenes.get(sourceSceneId)
  const targetScene = game.scenes.get(targetSceneId)
  if (!sourceScene || !targetScene) {
    console.warn('source/target scene not found', data)
    return
  }

  // get selected tokens data
  const selectedTokensData = foundry.utils.duplicate(sourceScene.tokens.filter((token) => selectedTokenIds.indexOf(token.id) >= 0))

  // set new token positions
  for (const token of selectedTokensData) {
    token.x = Math.round(targetData.x - token.width * targetScene.grid.size / 2)
    token.y = Math.round(targetData.y - token.height * targetScene.grid.size / 2)
  }

  // remove selected tokens from current scene (keep remaining tokens)
  await sourceScene.deleteEmbeddedDocuments(foundry.documents.BaseToken.embeddedName, selectedTokenIds, { isUndo: true })

  // add selected tokens to target scene
  await targetScene.createEmbeddedDocuments(foundry.documents.BaseToken.embeddedName, selectedTokensData, { isUndo: true })

  if (userId === game.userId) {
    // if we self requested a teleport we can switch the scene without an event
    await handleTokenSelectRequestPlayer(data)
  } else {
    // request token select from player
    await game.socket.emit('module.stairways', { eventName: 'tokenSelectRequestPlayer', data })
  }
}

export const handleTokenSelectRequestPlayer = async (data) => {
  const { selectedTokenIds, targetSceneId, targetData, userId } = data

  // ignore requests for other players
  if (userId !== game.userId) {
    return
  }

  // find target scene
  const targetScene = game.scenes.get(targetSceneId)
  if (!targetScene) {
    console.warn('target scene not found', data)
    return
  }

  // switch to target scene
  await targetScene.view()

  // TODO: we may do a premature select if the tokens aren't there yet
  // we then may end up with a different token selected

  // re-select tokens on target scene
  const targetTokens = foundry.canvas.canvas.tokens.placeables.filter((token) => selectedTokenIds.indexOf(token.id) >= 0)
  for (const token of targetTokens) {
    token.control()
  }

  // pan to stairway target
  foundry.canvas.canvas.pan({ x: targetData.x, y: targetData.y })

  // call hook
  Hooks.callAll('StairwayTeleport', data)
}

/// Hook modifyDocument events
/// we need to hijack them and redirect the save location
export const hookModifyDocument = () => {
  const origDispatch = foundry.core.SocketInterface.prototype.constructor.dispatch
  foundry.core.SocketInterface.prototype.constructor.dispatch = function (eventName, request) {
    // log and report error for unexpected behaviour for further investigation
    const reportError = (...args) => {
      console.error(...args)
    }
  }
}
