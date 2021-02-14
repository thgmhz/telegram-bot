const RssParser = require('rss-parser')
const rss = new RssParser()

const posted = []

const getLink = ({ feed, i }) => feed[i].link
  
const get = async () => {
  let i = 0
  let link

  const { items: rtpFeed } = await rss.parseURL('https://www.rtp.pt/noticias/rss/pais')
  
  while(true) {
    link = getLink({ feed: rtpFeed, i })
  
    if (!posted.includes(link)) {
      posted.push(link)
      break
    }

    i++
  }

  return link
}

module.exports = {
  get,
}