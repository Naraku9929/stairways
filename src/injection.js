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

  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    StairwayDocument,
    'stairways',
    StairwayConfig,
    {
      makeDefault: true,
      types: ['base']
    }
  )

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
  // Use the v13 canvas layer registration system
  CONFIG.Canvas.layers.stairways = {
    layerClass: StairwayLayer,
    group: 'interface'
  }
  
  // Ensure layer is properly registered in canvas groups
  Object.defineProperty(foundry.canvas.Canvas.prototype, 'stairways', {
    get: function() {
      return this.layers.find(l => l.name === 'stairways')
    }
  })
}

const hookBaseScene = () => {
  const BaseScene = foundry.documents.BaseScene
  
  // Use v13's document registration system
  if (BaseScene.defineSchema) {
    const originalDefineSchema = BaseScene.defineSchema
    BaseScene.defineSchema = function() {
      const schema = originalDefineSchema.call(this)
      if (!schema.stairways) {
        schema.stairways = new foundry.data.fields.EmbeddedCollectionField(BaseStairway)
      }
      return schema
    }
  }
  
  // Ensure metadata is properly set
  foundry.utils.mergeObject(BaseScene.metadata, {
    embedded: { Stairway: 'stairways' }
  })
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
