require('dotenv').config()

const Telegraf = require('telegraf')
const { Composer } = require('micro-bot')
const path = require('path')
const captcha = require('./captcha.js')

const isDev = process.argv[2] === 'isDev' || false

const bot = isDev
  ? new Telegraf(process.env.BOT_TOKEN)
  : new Composer

const App = {
  usersInCaptcha: [],

  init() {
    isDev && bot.launch()

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
        if (text.toLowerCase() == user.captcha.code.toLowerCase()) {
          this.removeUserFromCaptchaList(user.id)
          
          await ctx.reply(`👍 Ok, ${user.userString} não é um robô.`)
          await ctx.reply(`${user.userString}, seja bem-vindo(a)!\n\nNão esqueça de ler as regras na mensagem fixada no topo do grupo.`)
          
          if (message && message.message_id) {
            user.messagesToDelete.push(message.message_id)
          }

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
            const msg_invalid = await ctx.reply(`${user.userString}, código inválido, você tem mais ${user.attempt} tentativas. Maiúsculas e minúsculas fazem diferença.`)
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
      console.log('#### onMemberEnter')

      const { message } = ctx
      const { new_chat_participant } = message
      const { id, first_name, last_name, username } = new_chat_participant

      if (username === 'TugaBot_bot') return

      let userString = `${first_name}`
      if (last_name) userString += ` ${last_name}`
      if (username) userString += ` (@${username})`
      
      // await ctx.reply(`${userString} entrou do grupo...`)

      const captcha = this.getRandomCaptcha() || captcha[0]

      const msg_welcome = await ctx.replyWithPhoto({ 
        source: path.join(__dirname, `/images/${captcha.image}`)
      }, { 
        caption: `Olá ${userString}!\n\nATENÇÃO: Para garantir que você não é um robô de spam, envie uma mensagem com as letras e números que aparecem na imagem acima.\n\nVocê tem 3 tentativas.\n\nMaiúsculas e minúsculas fazem diferença.\n\nSe as tentativas não forem feitas dentro de 3 minutos você será removido(a) do grupo automaticamente.`
      })

      console.log('##### msg_welcome', msg_welcome)
      console.log('##### msg_welcome.message_id', msg_welcome.message_id)
      
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

