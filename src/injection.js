import { StairwayLayer } from './StairwayLayer.js'
import { StairwayDocument } from './StairwayDocument.js'
import { Stairway } from './Stairway.js'
import { StairwayControl } from './StairwayControl.js'
import { StairwayConfig } from './StairwayConfig.js'
import { BaseStairway } from './BaseStairway.js'

const fields = foundry.data.fields

export const injectStairways = () => {
  // register stairway classes
  foundry.core.CONFIG.Stairway = {
    documentClass: StairwayDocument,
    objectClass: Stairway,
    layerClass: StairwayLayer,
    sheetClasses: {}
  }

  const origDocumentTypesGetter = Object.getOwnPropertyDescriptor(foundry.Game.prototype, 'documentTypes').get
  Object.defineProperty(
    foundry.Game.prototype,
    'documentTypes',
    {
      get: function () {
        return {
          ...origDocumentTypesGetter.call(this),
          Stairway: ['base']
        }
      }
    }
  )

  foundry.applications.apps.DocumentSheetConfig.registerSheet(StairwayDocument, 'stairways', StairwayConfig, {
    makeDefault: true,
    types: ['base']
  })

  hookCanvas()
  hookBaseScene()
  hookControlsLayer()
  hookTokenLayer()

  // add stairways as embedded document for existing scenes
  for (const scene of foundry.Game.prototype.scenes) {
    if (!Array.isArray(scene.flags.stairways)) {
      scene.flags.stairways = []
    }
    //scene.stairways = foundry.utils.duplicate(scene.flags.stairways || [])
    scene.stairways = new foundry.abstract.EmbeddedCollection(StairwayDocument, scene.flags.stairways.map(s => new StairwayDocument(s, { parent: scene })));
  }
}

const hookCanvas = () => {
  // --- v13-compatible layer registration ----------------------------------
  // Merge a new entry instead of replacing the whole object so we retain
  // any non-enumerable properties or getters the core might have added.

  foundry.canvas.Canvas.layers = foundry.utils.mergeObject(foundry.canvas.Canvas.layers, {
    stairways: {
      layerClass: StairwayLayer,
      group: 'interface'
    }
  }, { inplace: false })

  // For compatibility with modules (and core versions) that rely on the
  // static Canvas.layers map, mirror the change there as well.
  if (foundry.canvas.Canvas.layers && !foundry.canvas.Canvas.layers.stairways) {
    const layers = foundry.canvas.Canvas.layers
    Object.defineProperty(foundry.canvas.Canvas, 'layers', {
      get: function () {
        return foundry.utils.mergeObject(layers, foundry.canvas.Canvas.layers)
      }
    })
  }

  // -----------------------------------------------------------------------
  // Hook the Canvas.getLayerByEmbeddedName
  const origGetLayerByEmbeddedName = foundry.canvas.Canvas.prototype.getLayerByEmbeddedName
  foundry.canvas.Canvas.prototype.getLayerByEmbeddedName = function (embeddedName) {
    if (embeddedName === 'Stairway') {
      return this.stairways
    } else {
      return origGetLayerByEmbeddedName.call(this, embeddedName)
    }
  }
}

const hookBaseScene = () => {
  // Reference to the core Scene class (constructor)
  const BaseScene = foundry.documents.BaseScene

  /* ------------------------------------------------------------------
   * 1. Register the new embedded document type in the Scene metadata
   * ------------------------------------------------------------------
   * From Foundry VTT v13 onward, the static `metadata` object is defined
   * directly on the constructor (not as an own property descriptor on
   * the prototype constructor).  Mutating it directly is therefore the
   * safest cross-version approach.
   */
  if (!BaseScene.metadata.embedded) BaseScene.metadata.embedded = {}
  BaseScene.metadata.embedded.Stairway = 'stairways'

  /* ------------------------------------------------------------------
   * 2. (Legacy support < v13)
   * ------------------------------------------------------------------
   * Earlier versions (≤ v12) defined `metadata` as an own property on the
   * constructor.  The above direct mutation still works, but we keep the
   * previous merge-strategy in place when that descriptor exists to avoid
   * surprises for worlds still running older cores.
   */
  const metaDesc = Object.getOwnPropertyDescriptor(BaseScene, 'metadata')
  if (metaDesc?.value) {
    metaDesc.value.embedded ??= {}
    metaDesc.value.embedded.Stairway = 'stairways'
  }

  /* ------------------------------------------------------------------
   * 3. Extend the Scene schema with the new EmbeddedCollectionField
   * ------------------------------------------------------------------
   *  ‑ We keep the original `defineSchema` reference and wrap it.
   *  ‑ This pattern survives the internal changes introduced in v13.
   */
  const defineSchemaOrig = BaseScene.defineSchema
  BaseScene.defineSchema = function () {
    const schema = defineSchemaOrig.call(this)
    if (!schema.stairways) {
      schema.stairways = new fields.EmbeddedCollectionField(BaseStairway)
    }
    return schema
  }
}

const hookControlsLayer = () => {
  // Hook ControlsLayer.draw
  const origDraw = foundry.canvas.layers.ControlsLayer.prototype._draw
  foundry.canvas.layers.ControlsLayer.prototype._draw = function () {
    this.drawStairways()
    origDraw.call(this)
  }
  foundry.canvas.layers.ControlsLayer.prototype.drawStairways = function () {
    // Create the container
    if (this.stairways) this.stairways.destroy({ children: true })
    this.stairways = this.addChild(new PIXI.Container())

    // Iterate over all stairways
    for (const stairway of foundry.canvas.canvas.stairways.placeables) {
      this.createStairwayControl(stairway)
    }

    this.stairways.visible = !foundry.canvas.canvas.stairways.active
  }
  foundry.canvas.layers.ControlsLayer.prototype.createStairwayControl = function (stairway) {
    const sw = this.stairways.addChild(new StairwayControl(stairway))
    sw.visible = false
    sw.draw()
  }
}

const hookTokenLayer = () => {
  // Hook TokenLayer.activate / deactivate
  const origActivate = foundry.canvas.layers.TokenLayer.prototype.activate
  foundry.canvas.layers.TokenLayer.prototype.activate = function () {
    origActivate.call(this)
    if (foundry.canvas.canvas.controls) foundry.canvas.canvas.controls.stairways.visible = true
  }

  const origDeactivate = foundry.canvas.layers.TokenLayer.prototype.deactivate
  foundry.canvas.layers.TokenLayer.prototype.deactivate = function () {
    origDeactivate.call(this)
    if (foundry.canvas.canvas.controls) foundry.canvas.canvas.controls.stairways.visible = false
  }
}
