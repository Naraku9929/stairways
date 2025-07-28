import { SETTINGS_KEY } from './settings.js'
import { GMs, handleTeleportRequestGM } from './teleport.js'

/**
 * An icon representing a Stairway Control
 * @extends {PIXI.Container}
 */
export class StairwayControl extends PIXI.Container {
  constructor (stairway) {
    super()
    this.stairway = stairway
    this.stairway.stairwayControl = this
  }

  /* -------------------------------------------- */

  /**
   * Draw the StairwayControl icon, displaying it's icon texture and border
   * @return {Promise<StairwayControl>}
   */
  async draw () {
    const width = this.stairway.controlIcon.width
    const height = this.stairway.controlIcon.height
    const scale = this.stairway.controlIcon.scale
    const borderSize = this.stairway.controlIcon.borderSize
    const disabled = this.stairway.document.disabled === true
    const hidden = this.stairway.document.hidden === true

    // scene label
    this.sceneLabel = this.sceneLabel || this.addChild(new PreciseText(this.stairway.sceneLabel, this.stairway.controlIcon.sceneLabelTextStyle))
    this.sceneLabel.anchor.set(0.5, 1)
    this.sceneLabel.text = this.stairway.sceneLabel
    this.sceneLabel.visible = game.user.isGM
    this.sceneLabel.position.set(...this.stairway.controlIcon.sceneLabelPosition)

    // label
    this.label = this.label || this.addChild(new PreciseText(this.stairway.label, this.stairway.labelTextStyle))
    this.label.anchor.set(0.5, 0)
    this.label.text = this.stairway.label
    this.label.style = this.stairway.labelTextStyle
    this.label.position.set(...this.stairway.controlIcon.labelPosition)

    // icon
    this.icon = this.icon || this.addChild(new PIXI.Sprite())
    this.icon.width = width
    this.icon.height = height
    this.icon.texture = await loadTexture(this.stairway.icon)

    // lock icon
    this.lockIcon = this.lockIcon || this.addChild(new PIXI.Sprite())
    this.lockIcon.width = width * 0.5
    this.lockIcon.height = height * 0.5
    this.lockIcon.texture = await loadTexture('icons/svg/padlock.svg')
    this.lockIcon.visible = disabled && game.user.isGM
    this.lockIcon.position.set(width * 0.5, height * 0.5)

    // background
    this.bg = this.bg || this.addChild(new PIXI.Graphics())
    this.bg.clear().beginFill(0x000000, 1.0).drawRoundedRect(...borderSize, 5).endFill()
    this.bg.alpha = 0

    // border
    this.border = this.border || this.addChild(new PIXI.Graphics())
    this.border.clear().lineStyle(2 * scale, 0xFF5500, 0.8).drawRoundedRect(...borderSize, 5).endFill()
    this.border.visible = false

    // control interactivity
    this.eventMode = 'static'
    this.interactiveChildren = false
    this.hitArea = new PIXI.Rectangle(...borderSize)

    // set position
    this.position.set(this.stairway.document.x - (width * 0.5), this.stairway.document.y - (height * 0.5))

    // set visibility
    this.alpha = hidden ? 0.5 : 1.0

    // activate listeners
    this.removeAllListeners()
    this.on('pointerover', this._onMouseOver)
      .on('pointerout', this._onMouseOut)
      .on('mousedown', this._onMouseDown)
      .on('rightdown', this._onRightDown)

    // return the control icon
    return this
  }

  /* -------------------------------------------- */

  /**
   * Determine whether the StairwayControl is visible to the calling user's perspective.
   * The control is always visible if the user is a GM and no Tokens are controlled.
   * @see {SightLayer#testVisibility}
   * @type {boolean}
   */
  get isVisible () {
    const data = this.stairway.document
    const point = new PIXI.Point(data.x, data.y)
    return canvas.visibility.testVisibility(point, { tolerance: 2, object: this })
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  _onMouseOver (ev) {
    ev.stopPropagation()
    if (game.paused && !game.user.isGM) return false
    this.border.visible = true
    this.bg.alpha = 0.25
    canvas.stairways._hover = this.stairway
  }

  /* -------------------------------------------- */

  _onMouseOut (ev) {
    ev.stopPropagation()
    if (game.paused && !game.user.isGM) return false
    this.border.visible = false
    this.bg.alpha = 0
    canvas.stairways._hover = null
  }

  /* -------------------------------------------- */

  /**
   * Handle left mouse down events on the stairway control icon.
   * This should teleport selected tokens to the other stairway icon.
   * @param event
   * @private
   */
  async _onMouseDown (event) {
    event.stopPropagation()

    const selectedTokens = canvas.tokens.controlled

    // usage restrictions for players
    if (!game.user.isGM) {
      // stairway is disabled
      if (this.stairway.document.disabled) {
        ui.notifications.info(game.i18n.localize('stairways.ui.messages.disabled'))
        return false
      }

      // disallow usage for players if game is paused
      if (game.paused) {
        ui.notifications.warn(game.i18n.localize('GAME.PausedWarning'))
        return false
      }

      // make sure at least one token is selected
      if (selectedTokens.length === 0) {
        ui.notifications.info(game.i18n.localize('stairways.ui.messages.no-token-selected'))
        return false
      }
    }

    // ensure the player meant to activate the stairway
    if (game.settings.get(SETTINGS_KEY, 'promptPlayer')) {
      const playerConfirmed = await Dialog.confirm({
        title: game.i18n.localize('stairways.ui.prompt.title'),
        content: game.i18n.localize('stairways.ui.prompt.content')
      })

      if (!playerConfirmed) {
        return false
      }
    }

    // target stairway + scene
    const { targetScene, targetData } = this.stairway.target

    // make sure we have a counter part of the stairway
    if (!targetData) {
      ui.notifications.error(game.i18n.localize('stairways.ui.messages.no-partner'))
      return false
    }

    // collect required data for a teleport request
    const sourceData = this.stairway.document
    const sourceSceneId = canvas.scene.id
    const selectedTokenIds = selectedTokens.map((token) => token.id)
    const targetSceneId = targetScene ? targetScene.id : null
    const data = { sourceSceneId, sourceData, selectedTokenIds, targetSceneId, targetData, userId: game.userId }

    // PreHook (can abort teleport)
    if (Hooks.call('PreStairwayTeleport', data) === false) {
      return false
    }

    // teleport tokens across scenes
    if (targetSceneId !== null) {
      // preload target scene
      game.scenes.preload(targetSceneId)

      if (game.user.isGM) {
        if (selectedTokens.length > 0) {
          // do the teleport ourself
          await handleTeleportRequestGM(data)
          return false
        }
      } else {
        // missing GM for teleport
        if (GMs().length === 0) {
          ui.notifications.error(game.i18n.localize('stairways.ui.messages.no-gm'))
          return false
        }

        // request teleport from a GM
        game.socket.emit('module.stairways', { eventName: 'teleportRequestGM', data })
      }
    } else {
      // teleport/move tokens within scene (update position)
      const animate = this.stairway.document.animate === true
      const tokenData = selectedTokens.map(token => {
        return {
          _id: token.id,
          x: Math.round(targetData.x - token.w / 2),
          y: Math.round(targetData.y - token.h / 2)
        }
      })
      await canvas.scene.updateEmbeddedDocuments(Token.embeddedName, tokenData, { animate })

      // Hook
      Hooks.call('StairwayTeleport', data)
    }

    // GM pan to target
    if (selectedTokens.length === 0) {
      if (targetSceneId !== null) {
        await targetScene.view()
      }

      canvas.pan({ x: targetData.x, y: targetData.y })
    }

    // event handled
    return false
  }

  /* -------------------------------------------- */

  /**
   * Handle right mouse down events on the door control icon
   * This should toggle whether the door is LOCKED or CLOSED
   * @param event
   * @private
   */
  _onRightDown (event) {
    event.stopPropagation()
    if (!game.user.isGM) return

    const { originalEvent } = event

    // disabled (right click)
    let attribute = 'disabled'
    if (originalEvent.altKey) {
      // hidden (alt + right click)
      attribute = 'hidden'
    }

    // toggle attribute state
    this.stairway.document.update({ [attribute]: !(this.stairway.document[attribute] === true) })
  }
}
