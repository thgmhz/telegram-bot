const { Scenes } = require('telegraf')
const scenario1 = require('./scenes/scenario1')

const scenes = [
  scenario1
]

const defaultScene = 'scenario1'

const stage = new Scenes.Stage(scenes, { defaultScene })

const onStart = context => context.scene.enter(defaultScene)  

module.exports = {
  stage,
  scenes,
  defaultScene,
  onStart,
}