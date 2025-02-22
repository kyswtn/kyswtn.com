import {getCollection, getEntry} from 'astro:content'
import rss from '@astrojs/rss'
import type {APIRoute} from 'astro'

export const GET: APIRoute = async (context) => {
  const websiteMeta = await getEntry('website', 'meta')
  if (!websiteMeta) throw new Error('Missing website/meta')

  const posts = await getCollection('posts', (post) => post.data.published && !post.data.unlisted)
  return rss({
    title: websiteMeta.data.title,
    description: websiteMeta.data.description,
    site: context.site ?? 'http://localhost:4321/',
    items: posts.map((post) => ({
      ...post.data,
      link: `/posts/${post.id}/`,
    })),
  })
}
