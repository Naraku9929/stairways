'use strict'

import { StairwayDocument } from './StairwayDocument.js'
import { StairwayLayer } from './StairwayLayer.js'
import { Stairway } from './Stairway.js'
import { StairwayConfig } from './StairwayConfig.js'
import { injectControls } from './toolbar.js'
import { injectStairways, hookModifyEmbeddedDocument } from './injection.js'
import { performMigrations } from './migration.js'
import { registerSettings } from './settings.js'
import { handleTeleportRequestGM, handleTokenSelectRequestPlayer, GMs } from './teleport.js'

// Init hook
Hooks.once('init', () => {
  // stairway settings
  registerSettings()

  // inject stairway layer / embedded document in hardcoded places
  // All CONFIG definitions are now handled within injectStairways()
  injectStairways()
})

// Ready hook
Hooks.once('ready', async () => {
  // check module compatibility
  if (!foundry.utils.isNewerVersion(game.version, '0.8.9')) {
    ui.notifications.error(game.i18n.localize('stairways.ui.messages.compatibility'))
    return
  }

  // perform migrations
  await performMigrations()
})

// Socket event listeners
Hooks.once('init', () => {
  if (game.socket) {
    game.socket.on('module.stairways', (request) => {
      switch (request.eventName) {
        case 'teleportRequestGM':
          handleTeleportRequestGM(request.data)
          break
        case 'tokenSelectRequestPlayer':
          handleTokenSelectRequestPlayer(request.data)
          break
        case 'modifyDocument':
          hookModifyEmbeddedDocument(request.data)
          break
      }
    })
  }
})

Hooks.on('getSceneControlButtons', (controls) => {
  if (!game.user.isGM) return
  injectControls(controls)
})

Hooks.on('sightRefresh', (sightLayer) => {
  // Stairway Icons
  for (const sw of foundry.canvas.canvas.controls.stairways.children) {
    sw.visible = !sw.stairway.document.hidden || game.user.isGM
    if (sightLayer.tokenVision) {
      sw.visible &&= sw.isVisible
    }
  }
})

Hooks.on(`paste${Stairway.embeddedName}`, StairwayLayer.onPasteStairway)

Hooks.on('renderModuleManagement', async (moduleManagement, htmlElement) => {
  if (!game.modules.get('module-credits')?.active) {
    const tags = await renderTemplate('modules/stairways/templates/module-management-tags.hbs')

    // Foundry ≤ v12 passed a jQuery object, v13+ passes a plain HTMLElement
    const html = htmlElement?.find ? htmlElement : $(htmlElement)

    html.find('li[data-module-name="stairways"] .package-overview .package-title').after(tags)
  }
})
