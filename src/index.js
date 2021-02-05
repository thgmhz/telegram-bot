require('dotenv').config()

const { Composer } = require('micro-bot')
const captcha = require('./captcha.js')

const bot = new Composer

const App = {
  usersInCaptcha: [],

  init() {
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

  deleteMessages(ctx, messagesId) {
    messagesId.forEach(id => {
      if (id) ctx.deleteMessage(id).catch(console.log)
    })
  },

  removeUserFromCaptchaList(id) {
    this.usersInCaptcha = this.usersInCaptcha.filter(user => user.id !== id)
  },

  Events: {
    async onNewMessage(ctx) {
      console.log('#### on new message')

      const { message } = ctx
      const { from, text } = message

      console.log('#### users in captcha', this.usersInCaptcha)

      
      // check if user is in captcha list
      const user = this.usersInCaptcha.find(user => user.id === from.id) || null    

      if (user) {
        if (text == user.captcha.code) {
          this.removeUserFromCaptchaList(user.id)
          await ctx.reply(`👍 Ok, ${user.userString} não é um robô.`)
          await ctx.reply(`${user.userString}, não esqueça de ler as regras na mensagem fixada no topo do grupo.`)          
          this.deleteMessages(ctx, user.messagesToDelete)
        } else {
          user.attempt -= 1

          if (user.attempt <= 0){
            this.kickUserInCaptcha({
              ctx, 
              id: user.id, 
              message: `🚨 ${user.userString} não digitou o código corretamente e foi removido(a).`
            })

            if (message && message.message_id) {
              user.messagesToDelete.push(message.message_id)
            }
    
            this.deleteMessages(ctx, user.messagesToDelete)

          } else {
            const msg_invalid = await ctx.reply(`${user.userString}, código inválido, você tem mais ${user.attempt} tentativas.`)
            user.messagesToDelete.push(msg_invalid.message_id)            
            user.messagesToDelete.push(message.message_id)
          }

          // update user attempt in captcha list
          this.usersInCaptcha = this.usersInCaptcha.map(usr => {
            return usr.id === user.id
              ? { ...usr, attempt: user.attempt, messagesToDelete: user.messagesToDelete }
              : usr
          })
        }                
      }
    },
    
    async onMemberEnter(ctx) {
      const { message } = ctx
      const { new_chat_participant } = message
      const { id, first_name, last_name, username } = new_chat_participant

      if (username === 'TugaBot_bot') return

      let userString = `${first_name}`
      if (last_name) userString += ` ${last_name}`
      if (username) userString += ` (@${username})`
      
      // await ctx.reply(`${userString} entrou do grupo...`)

      const captcha = this.getRandomCaptcha() || captcha[0]

      const msg_welcome = await ctx.reply(`
        Olá ${userString}!\n\nSeja bem-vindo(a) ao grupo Morar em Portugal 🇵🇹!\n\nATENÇÃO: Para garantir que você não é um robô, envie uma mensagem com os números que aparecem abaixo. Se a mensagem não for enviada em até 3 minutos você será removido(a) do grupo automaticamente.\n\n${userString}, digite isso:\n${captcha.code}
      `)
      
      //const msg_captcha = await ctx.replyWithPhoto({ source: `./images/${captcha.image}` })
      
      const messagesToDelete = [msg_welcome.message_id] 

      console.log('######### captcha', captcha)

      // add user to captcha list
      this.usersInCaptcha.push({ 
        id, 
        userString,
        captcha,
        attempt: 3,
        messagesToDelete,
      })  

      setTimeout(() => {
        this.deleteMessages(ctx, messagesToDelete)

        this.kickUserInCaptcha({
          ctx, 
          id, 
          message: `🚨 ${userString} não digitou o código e foi removido(a).`
        })
      }, 180000)          
    }
  }
}

App.init()

module.exports = bot

