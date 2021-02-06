const { Composer } = require('micro-bot')
const { Telegraf } = require('telegraf')
const path = require('path')

const captchaList = require('./captcha')

class Bot {
  constructor({ token, isDev }) {
    this.bot = isDev
      ? new Telegraf(token)
      : new Composer
    
    if (isDev) this.bot.launch()

    this.isDev = isDev
    this.maxAttempts = 3
    this.sensitiveCase = false
    this.usersBlacklist = []
    this.captchaTimeout = 180000
  }

  init({ botUsername, maxAttempts, captchaTimeout, sensitiveCase }) {
    this.botUsername = botUsername
    this.maxAttempts = maxAttempts || this.maxAttempts
    this.captchaTimeout = captchaTimeout || this.captchaTimeout
    this.sensitiveCase = sensitiveCase
    this.bindEvents()
  }

  bindEvents() {
    this.bot.on('new_chat_members', this.onNewChatMembers.bind(this))
    this.bot.on('message', this.onNewMessage.bind(this))
  }

  getRandomCaptcha() {
    const randomNumber = Math.floor(Math.random() * captchaList.length) + 0

    return captchaList[randomNumber]
  }

  setMessages({ welcome, timeout, attemptFail, attemptsOver, captchaSuccess }) {
    this.welcomeMessage = welcome
    this.timeoutMessage = timeout
    this.attemptFailMessage = attemptFail
    this.attemptsOverMessage = attemptsOver
    this.captchaSuccessMessage = captchaSuccess
  }

  replaceAll(str, find, replace) {
    const escapedFind = find.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1')
    return str.replace(new RegExp(escapedFind, 'g'), replace)
  }

  parseMessage({ user, message }) {
    let msg = this.replaceAll(message, '$firstname', user.first_name)
    msg = this.replaceAll(msg, '$lastname', user.last_name || '')
    msg = this.replaceAll(msg, '$username', `@${user.username}` || '')
    msg = this.replaceAll(msg, '$attemptCount', user.attempt)

    return msg
  }

  addUserToBlacklist(user) {
    this.usersBlacklist.push(user)
  }

  getUserFromBlacklist(userId) {
    return this.usersBlacklist.find(usr => usr.id === userId)
  }

  removeUserFromBlacklist(userId) {
    this.usersBlacklist = this.usersBlacklist.filter(usr => usr.id !== userId)
  }

  updateUserAttempts({ userId, attempt }) {
    const user = this.getUserFromBlacklist(userId)

    user.attempt = attempt

    this.usersBlacklist = this.usersBlacklist.map(usr => 
      usr.id === userId
        ? user 
        : usr
    )
  }

  updateUserMessages({ userId, messagesIds }) {
    const user = this.getUserFromBlacklist(userId)

    user.messages = [
      ...user.messages,
      ...messagesIds,
    ]

    this.usersBlacklist = this.usersBlacklist.map(usr => 
      usr.id === userId
        ? user 
        : usr
    )
  }

  deleteMessages({ context, messages }) {
    messages.forEach(id => {
      if (id) context.deleteMessage(id).catch(console.log)
    })
  }

  acceptUser({ context, user }) {
    this.removeUserFromBlacklist(user.id)

    const message = this.parseMessage({
      user,
      message: this.captchaSuccessMessage,
    })

    context.reply(message)

    this.deleteMessages({
      context,
      messages: user.messages,
    })
  }

  rejectUser({ context, user, message }) {
    const userInBlacklist = this.getUserFromBlacklist(user.id)

    if (userInBlacklist) {
      this.removeUserFromBlacklist(user.id)
      this.deleteMessages({
        context,
        messages: userInBlacklist.messages,
      })
      context.kickChatMember(user.id)
      context.reply(message)
    }
  }

  async newAttempt({ context, user, messageId }) {
    user.attempt += 1
    const canTryAgain = (user.attempt < this.maxAttempts)

    if (!canTryAgain) {
      const attemptsOver = this.parseMessage({
        user,
        message: this.attemptsOverMessage,
      })
      
      this.updateUserMessages({
        userId: user.id,
        messagesIds: [
          messageId,
        ],
      })

      return this.rejectUser({
        context,
        user,
        message: attemptsOver,
      })
    }

    const attemptFail = this.parseMessage({
      user,
      message: this.attemptFailMessage,
    })

    const failMessage = await context.reply(attemptFail)
    
    this.updateUserAttempts({
      userId: user.id,
      attempt: user.attempt,
    })

    this.updateUserMessages({
      userId: user.id,
      messagesIds: [
        messageId,
        failMessage.message_id,
      ],
    })
  }

  async onNewChatMembers(context) {
    const { message } = context
    const { new_chat_participant } = message
    const { id, first_name, last_name, username } = new_chat_participant

    if (username === this.botUsername) return

    const user = {
      id, 
      first_name,
      last_name,
      username,
    }

    const captcha = this.getRandomCaptcha() || captchaList[0]

    const welcomeMessage = this.parseMessage({
      user,
      message: this.welcomeMessage
    })

    const welcome = await context.replyWithPhoto({ 
      source: path.join(__dirname, `/captcha/images/${captcha.image}`)
    }, { 
      caption: welcomeMessage
    })

    this.addUserToBlacklist({
      ...user,
      captcha,
      attempt: 0,
      messages: [welcome.message_id]
    })

    setTimeout(() => {
      const userInBlacklist = this.getUserFromBlacklist(user.id)

      if (userInBlacklist) {
        const message = this.parseMessage({
          user,
          message: this.timeoutMessage,
        })
        
        this.rejectUser({
          user, 
          context, 
          message,
        })
      }
    }, this.captchaTimeout)
  }

  onNewMessage(context) {
    const { message } = context
    const { message_id, from, text } = message

    const userInBlacklist = this.getUserFromBlacklist(from.id)    
    
    if (userInBlacklist) {
      const { captcha } = userInBlacklist
      const { code } = captcha

      const userSolvedCaptcha = this.sensitiveCase
        ? (text === code)
        : (text.toLowerCase() === code.toLowerCase())

      if(!userSolvedCaptcha) {
        return this.newAttempt({
          context,
          user: userInBlacklist,
          messageId: message_id,
        })        
      }

      this.updateUserMessages({
        userId: userInBlacklist.id,
        messagesIds: [message_id],
      })

      this.acceptUser({
        context, 
        user: userInBlacklist, 
      })      
    }
  }
}

module.exports = Bot