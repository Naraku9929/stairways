import { StairwayDocument } from './StairwayDocument.js'

export const STAIRWAY_DEFAULTS = {
  scene: 'null',
  icon: 'modules/stairways/icons/stairway.svg',
  width: 0.4,
  height: 0.4,
  fontFamily: foundry.CONST.DEFAULT_FONT_FAMILY,
  fontSize: 24,
  textColor: '#FFFFFF'
}
export const NO_RESET_DEFAULT = ['name', 'scene', 'x', 'y']

export const COLOR = {
  onScene: 0x000000,
  onTargetScene: 0x000080,
  noPartnerOtherScene: 0xffbf00,
  noPartner: 0xffbf00,
  nonMonogamous: 0xde3264
}

/**
 * Stairway Configuration Sheet
 * @implements {DocumentSheet}
 *
 * @param stairway {Stairway} The Stairway object for which settings are being configured
 * @param options {Object}     StairwayConfig ui options (see Application)
 */
const { DocumentSheetV2 } = foundry.applications.sheets

export class StairwayConfig extends DocumentSheetV2 {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: 'stairway-config',
    classes: ['stairway-sheet'],
    tag: 'form',
    window: {
      title: 'stairways.ui.config.title',
      icon: 'fas fa-stairs'
    },
    position: {
      width: 480,
      height: 'auto'
    },
    form: {
      handler: StairwayConfig.#onSubmitForm,
      submitOnChange: true,
      closeOnSubmit: false
    }
  }

  static PARTS = {
    header: { template: 'templates/generic/form-header.hbs' },
    tabs: { template: 'templates/generic/tab-navigation.hbs' },
    main: { template: 'modules/stairways/templates/stairway-config-main.hbs' },
    label: { template: 'modules/stairways/templates/stairway-config-label.hbs' },
    position: { template: 'modules/stairways/templates/stairway-config-position.hbs' }
  }

  tabGroups = {
    sheet: 'main'
  }

  // Form submission handler
  static async #onSubmitForm (event, form, formData) {
    const expandedData = foundry.utils.expandObject(formData.object)
    return this.document.update(expandedData)
  }

  // Data preparation for v2
  async _prepareContext (options) {
    const context = await super._prepareContext(options)

    // Add stairway-specific context
    const scenes = {
      null: game.i18n.localize('stairways.ui.config.current-scene')
    }
    for (const scene of game.scenes) {
      scenes[scene.id] = scene.name
    }

    const iconName = (name) => game.i18n.localize(`stairways.ui.config.icons.${name}`)
    const icons = {
      [STAIRWAY_DEFAULTS.icon]: iconName('stairway'),
      'icons/svg/door-steel.svg': iconName('door-steel'),
      'icons/svg/door-closed.svg': iconName('door-closed'),
      'icons/svg/door-exit.svg': iconName('door-exit'),
      'icons/svg/cave.svg': iconName('cave'),
      'icons/svg/house.svg': iconName('house'),
      'icons/svg/city.svg': iconName('city'),
      'icons/svg/castle.svg': iconName('castle')
    }

    const fontFamilies = Object.keys(CONFIG.fontDefinitions).reduce((obj, f) => {
      obj[f] = f
      return obj
    }, {})

    // replace null with defaults
    for (const key in STAIRWAY_DEFAULTS) {
      context.document[key] ??= STAIRWAY_DEFAULTS[key]
    }

    return {
      ...context,
      status: this.document.object.status,
      scenes,
      icons,
      fontFamilies,
      tabs: this._getTabs(options.parts),
      submitText: game.i18n.localize('stairways.ui.config.submit')
    }
  }

  _getTabs (parts) {
    return [
      { id: 'main', group: 'sheet', icon: 'fas fa-cog', label: 'stairways.ui.config.tab-main' },
      { id: 'label', group: 'sheet', icon: 'fas fa-font', label: 'stairways.ui.config.tab-label' },
      { id: 'position', group: 'sheet', icon: 'fas fa-map-marker-alt', label: 'stairways.ui.config.tab-position' }
    ]
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners (html) {
    super.activateListeners(html)
    this.iconPicker = html.find('file-picker[name="icon"]')[0]
    html.find('img.select-icon').click(this._onSelectIcon.bind(this))
    html.find('button[name="resetDefault"]').click(this._onResetDefaults.bind(this))
  }

  /* -------------------------------------------- */

  _onSelectIcon (event) {
    const icon = event.currentTarget.attributes.src.value
    this.iconPicker.value = icon
    this.iconPicker.dispatchEvent(new Event('change', { bubbles: true }))
  }

  /* -------------------------------------------- */

  /**
   * Reset the Stairway configuration settings to their default values
   * @param event
   * @private
   */
  _onResetDefaults (event) {
    event.preventDefault()

    const defaults = StairwayDocument.cleanData()

    for (const key in defaults) {
      // don't reset internal and required fields
      if (key.startsWith('_') || NO_RESET_DEFAULT.includes(key)) {
        delete defaults[key]
        continue
      }

      // use default value or null
      defaults[key] = STAIRWAY_DEFAULTS[key] ?? null
    }

    this._previewChanges(defaults)
    this.render()
  }

  /* -------------------------------------------- */

  /**
   * Preview changes to the Stairway document as if they were true document updates.
   * @param {object} change       Data which simulates a document update
   * @protected
   */
  _previewChanges (change) {
    this.object.updateSource(change)
    this.object._onUpdate(change, { render: false }, game.user.id)
  }

  /* -------------------------------------------- */

  /**
   * Restore the true data for the Stairway document when the form is submitted or closed.
   * @protected
   */
  _resetPreview () {
    this._previewChanges(this.original.toObject())
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async close (options = {}) {
    if (!options.force) this._resetPreview()
    return super.close(options)
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onChangeInput (event) {
    await super._onChangeInput(event)
    const previewData = this._getSubmitData()
    this._previewChanges(previewData)
  }

  /* -------------------------------------------- */

  /** @override */
  _getSubmitData (updateData = {}) {
    const formData = super._getSubmitData(updateData)

    // replace default values with null
    for (const key in STAIRWAY_DEFAULTS) {
      if (formData[key] === STAIRWAY_DEFAULTS[key]) {
        formData[key] = null
      }
    }

    return formData
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject (event, formData) {
    this._resetPreview()
    if (this.object.id) return this.object.update(formData)
    return this.object.constructor.create(formData, { parent: canvas.scene })
  }
}
