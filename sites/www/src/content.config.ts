import {defineCollection, z} from 'astro:content'
import {glob} from 'astro/loaders'

const posts = defineCollection({
  loader: glob({pattern: '**/*.{md,mdx}', base: '../../notes/posts'}),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    state: z.enum(['published', 'draft']).nullable(),
    date: z.coerce.date(),
  }),
})

export const collections = {posts}
