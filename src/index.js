require('dotenv').config()

const Bot = require('./Bot.js')

const token = process.env.BOT_TOKEN
const isDev = process.argv[2] === 'isDev'

const bot = new Bot({ 
  token,
  isDev,
  botUsername: 'TugaBot_bot',
  captchaTimeout: 60000 * 5,
  maxAttempts: 3,
  sensitiveCase: false,
})

bot.setMessages({
  welcome: 'Olá $firstname $lastname!\n\nATENÇÃO: Para garantir que você não é um robô de spam, envie uma mensagem com as letras e números que aparecem na imagem acima.\n\nVocê tem 3 tentativas.\n\nSe as tentativas não forem feitas dentro de 5 minutos você será removido(a) do grupo automaticamente.\n\n$username',
  timeout: '🚨 $firstname $lastname não digitou o código e foi removido(a).',
  attemptFail: '$firstname $lastname, código inválido! Você tem mais $attemptCount tentativas.',
  attemptsOver: '🚨 $firstname $lastname não digitou o código corretamente e foi removido(a).',
  captchaSuccess: '👍 Ok, $firstname $lastname não é um robô spam.\n\n$firstname, seja bem-vindo(a)!\n\nNão esqueça de ler as regras na mensagem fixada no topo do grupo.'
})

module.exports = bot

