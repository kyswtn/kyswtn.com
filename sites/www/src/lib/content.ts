import {getCollection} from 'astro:content'

export function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export async function getListedPosts() {
  let posts = await getCollection('posts')
  posts = posts
    .filter((post) => post.data.state !== null)
    .sort((prev, next) => next.data.date.valueOf() - prev.data.date.valueOf())

  return posts.map((post) => ({
    ...post,
    dataFormatted: {
      date: formatDate(post.data.date),
    },
  }))
}

export type Post = Awaited<ReturnType<typeof getListedPosts>>[number]
