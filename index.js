require('dotenv').config();
const Telegraf  = require('telegraf')
const captcha = require('./captcha.js')

const bot = new Telegraf(process.env.TOKEN)

const App = {
  usersInCaptcha: [],

  init() {
    bot.launch()
    this.bindEvents()
  },

  bindEvents() {
    bot.on('new_chat_members', this.Events.onMemberEnter.bind(this))
    bot.on('message', this.Events.onNewMessage.bind(this))
  },

  getRandomCaptcha() {
    const randomNumber = Math.floor(Math.random() * captcha.length) + 0

    return captcha[randomNumber]
  },

  kickUserInCaptcha({ ctx, id, message }) {
    const user = this.usersInCaptcha.find(user => user.id === id)

    if (user) {
      this.removeUserFromCaptchaList(user.id)
      ctx.kickChatMember(id)
      ctx.reply(message)
    }
  },

  removeUserFromCaptchaList(id) {
    this.usersInCaptcha = this.usersInCaptcha.filter(user => user.id !== id)
  },

  Events: {
    onNewMessage(ctx) {
      const { message } = ctx
      const { from, text } = message
      
      const user = this.usersInCaptcha.find(user => user.id === from.id)

      if (user) {
        if (text === user.captcha.code) {
          this.removeUserFromCaptchaList(user.id)
          ctx.reply(`👍 ${user.userString} não é um robô, pode ficar no grupo :)`)
          ctx.reply(`${user.userString}, não esqueça de ler as regras na mensagem fixada no topo do grupo.`)        
        } else {
          this.kickUserInCaptcha({
            ctx, 
            id: user.id, 
            message: `🚨 ${user.userString} não digitou o captcha corretamente e foi removido(a)!`
          })
        }

        user.messagesToDelete.forEach(messageId => ctx.deleteMessage(messageId))
      }
    },
    
    async onMemberEnter(ctx) {
      const { message } = ctx
      const { new_chat_participant } = message
      const { id, first_name, last_name, username } = new_chat_participant

      if (username === 'tugabot_bot') return

      let userString = `${first_name}`
      if (last_name) userString += ` ${last_name}`
      if (username) userString += ` (@${username})`
      
      const captcha = this.getRandomCaptcha()

      ctx.reply(`💛 ${first_name} entrou do grupo!`)

      const msg = await ctx.reply(`
        Olá ${userString}!\n\nSeja bem-vindo(a) ao grupo Morar em Portugal 🇵🇹!\n\nATENÇÃO: Para garantir que você não é um robô, envie uma mensagem com os números que aparecem na imagem abaixo. Se a mensagem não for enviada em até 3 minutos você será removido(a) do grupo automaticamente.
      `)

      const msgImg = await ctx.replyWithPhoto({ source: `./images/${captcha.image}` })

      setTimeout(() => 
        this.kickUserInCaptcha({
          ctx, 
          id, 
          message: `🚨 ${first_name} foi removido(a) por não digitar o código dentro do tempo limite.`
        })
      , 100000)
      
      this.usersInCaptcha.push({ 
        id, 
        userString,
        captcha,
        messagesToDelete: [msg.message_id, msgImg.message_id],
      })      
    }
  }
}

App.init()

