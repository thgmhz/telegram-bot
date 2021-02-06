const { Scenes, Markup, session } = require('telegraf')

const scenario1 = new Scenes.BaseScene('scenario1')

const enter = context => {
  context.session.myData = {}
  context.reply('What is your drug?', Markup.inlineKeyboard([
    Markup.button.callback('Movie', 'MOVIE_ACTION'),
    Markup.button.callback('Theater', 'THEATER_ACTION')
  ]))
}

scenario1.enter(enter)

module.exports = scenario1