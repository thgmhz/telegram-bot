const cron = require('node-cron')

const configs = require('./configs')

const start = context => {
  configs.forEach(({ interval, fn }) => cron.schedule(interval, () => fn(context)))
}

module.exports = {
  start,
}