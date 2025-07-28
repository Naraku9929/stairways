import { STAIRWAY_DEFAULTS, COLOR } from './StairwayConfig.js'

// Polyfill for loadTexture in FVTT v13
const loadTex = (src) => {
  // Check if the new API exists first
  if (foundry.canvas?.loadTexture) {
    return foundry.canvas.loadTexture(src)
  }
  // Fallback to global loadTexture for older versions
  if (typeof loadTexture !== 'undefined') {
    return loadTexture(src)
  }
  // Final fallback
  throw new Error('No texture loading function available')
}

const ICON_SIZE = 100
const SCALE_BORDER = false

/**
 * An ControlIcon which represents an active Stairway.
 * @extends {ControlIcon}
 */
export class StairwayControlIcon extends foundry.applications.api.ControlIcon {
  constructor ({ sceneLabel, label, textStyle, typeColor = 0x000000, statusColor = 0x000000, texture, width = 1, height = 1, borderColor = 0xFF5500, tint = null } = {}, ...args) {
    super()

    // public properties
    this.label = label
    this.textStyle = textStyle
    this.sceneLabel = sceneLabel
    this.typeColor = typeColor
    this.statusColor = statusColor
    this.texture = texture
    this.width = width
    this.height = height
    this.borderColor = borderColor
    this.tint = tint

    // private properties
    this._hover = false
    this._cached = {}

    // create containers
    this.bg = this.addChild(new PIXI.Graphics())
    this.border = this.addChild(new PIXI.Graphics())
    this.icon = this.addChild(new PIXI.Sprite())
    this.text = this.addChild(new PIXI.Text(this.label, this.textStyle))
    this.sceneText = this.addChild(new PIXI.Text(this.sceneLabel, this.sceneLabelTextStyle))

    this.interactive = true
    this.hitArea = new PIXI.Rectangle(0, 0, this.width, this.height)

    // activate listeners
    this.addListener('mouseover', this._onHoverIn)
    this.addListener('mouseout', this._onHoverOut)
  }

  /* -------------------------------------------- */

  /** @override */
  async draw () {
    // set icon texture
    this.icon.texture = await loadTex(this.texture)

    // don't draw when destroyed
    if (this.destroyed) return this

    const scale = this.scale

    // Draw background
    this.bg.clear().beginFill(this.typeColor || 0, 0.4).lineStyle(2 * scale, this.statusColor || 0, 1.0).drawRoundedRect(...this.borderSize, 5).endFill()

    // Draw border
    this.border.clear().lineStyle(2 * scale, this.borderColor, 1.0).drawRoundedRect(...this.borderSize, 5).endFill()
    this.border.visible = false

    // Draw icon
    this.icon.texture = this.texture
    this.icon.width = this.width
    this.icon.height = this.height
    this.icon.tint = Number.isNumeric(this.tintColor) ? this.tintColor : 0xFFFFFF

    const PreciseTextClass = foundry.canvas.containers.PreciseText

    // Draw scene label
    this.sceneLabel = this.sceneLabel || this.addChild(new PreciseTextClass(this.sceneLabelText, this.sceneLabelTextStyle))
    this.sceneLabel.anchor.set(0.5, 1)
    this.sceneLabel.position.set(...this.sceneLabelPosition)

    // Draw label
    this.label = this.label || this.addChild(new PreciseTextClass(this.labelText, this.labelTextStyle))
    this.label.anchor.set(0.5, 0)
    this.label.position.set(...this.labelPosition)

    return this
  }

  /* -------------------------------------------- */

  static get canvasScale () {
    return (canvas.dimensions.size || 100) / 100
  }

  /* -------------------------------------------- */

  get scale () {
    if (SCALE_BORDER) {
      return (this.iconWidth + this.iconHeight) / (STAIRWAY_DEFAULTS.width + STAIRWAY_DEFAULTS.height) * StairwayControlIcon.canvasScale
    } else {
      return StairwayControlIcon.canvasScale
    }
  }

  /* -------------------------------------------- */

  get width () {
    return this.iconWidth * ICON_SIZE * StairwayControlIcon.canvasScale
  }

  /* -------------------------------------------- */

  get height () {
    return this.iconHeight * ICON_SIZE * StairwayControlIcon.canvasScale
  }

  /* -------------------------------------------- */

  get borderSize () {
    const scale = this.scale
    return [-2 * scale, -2 * scale, this.width + 4 * scale, this.height + 4 * scale]
  }

  /* -------------------------------------------- */

  get labelPosition () {
    const borderSize = this.borderSize
    return [borderSize[2] * 0.5, borderSize[3]]
  }

  /* -------------------------------------------- */

  get sceneLabelPosition () {
    const borderSize = this.borderSize
    return [borderSize[2] * 0.5, borderSize[1]]
  }

  /* -------------------------------------------- */

  /**
   * Define a PIXI TextStyle object which is used for the label text
   * @returns {PIXI.TextStyle}
   */
  get sceneLabelTextStyle () {
    const style = CONFIG.canvasTextStyle.clone()

    // alignment
    style.align = 'center'

    // font preferences
    style.fontFamily = STAIRWAY_DEFAULTS.fontFamily
    style.fontSize = STAIRWAY_DEFAULTS.fontSize

    // toggle stroke style depending on whether the text color is dark or light
    const color = new foundry.utils.Color(COLOR.onTargetScene)
    style.fill = color
    style.strokeThickness = 1
    style.stroke = 0xcccccc

    // drop shadow
    style.dropShadow = true
    style.dropShadowColor = style.stroke
    style.dropShadowBlur = 2
    style.dropShadowAngle = 0
    style.dropShadowDistance = 0

    return style
  }

  /* -------------------------------------------- */

  _onHoverIn (event) {
    this.border.visible = true
  }

  _onHoverOut (event) {
    this.border.visible = false
  }
}
