import axios from 'axios'

const BASE = 'https://graph.facebook.com/v19.0'

export async function publicarPost(produto, imagemUrl, config) {
  const { account_id, access_token } = config
  const caption = `${produto.copy}\n\n${produto.hashtags}`

  const { data: container } = await axios.post(
    `${BASE}/${account_id}/media`,
    { image_url: imagemUrl, caption, access_token }
  )

  const { data: publish } = await axios.post(
    `${BASE}/${account_id}/media_publish`,
    { creation_id: container.id, access_token }
  )

  return publish.id
}
