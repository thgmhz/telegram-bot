const feed = require('../feed')

// pattern: second, minute, hour, days of month, month, days of week

const configs = [
  {
    interval: '* * */1 * * *',
    fn: async context => {
      const link = await feed.get()
      context.reply(`🇵🇹 Notícia de última hora:\n\n${link}`)
    }
  },
  {
    interval: '* * */48 * * *',
    fn: context => {
      context.reply(`🇵🇹 🇵🇹 🇵🇹\n\nVcs conhecem o Método Morar em Portugal?\n\nLá tem todas informações que você precisa para imigrar com segurança!\n\nClique neste link para acessar: http://bit.ly/388mjha`)
    }
  },
  {
    interval: '* * */72 * * *',
    fn: context => {
      context.reply(`🇵🇹 🇵🇹 🇵🇹\n\n- Toc, toc!\n\n- Quem é?\n\n- A oportunidade... trago-lhe isto:\n\nhttps://bit.ly/formacao_fullstack_javascript`)
    }
  },
  {
    interval: '* * */94 * * *',
    fn: context => {
      context.reply(`Hey! Não sei se vc sabe, o Thiago tem um Workshop Gratuito sobre Programação Web!\n\nFeito para você dar seus primeiros passos no mundo da programação!\n\nTenho certeza que vc vai gostar :)\n\nInscreva-se:\nhttps://bit.ly/workshop_gratuito_ca_estamos`)
    }
  },
]

module.exports = configs