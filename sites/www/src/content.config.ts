import {defineCollection, z} from 'astro:content'
import {file, glob} from 'astro/loaders'

const website = defineCollection({
  loader: glob({pattern: '**/*.{md,mdx}', base: '../../notes/website'}),
  schema: () =>
    z.object({
      title: z.string(),
      description: z.string(),
      links: z.record(z.string()).default({}),
    }),
})

const posts = defineCollection({
  loader: glob({pattern: '**/*.{md,mdx}', base: '../../notes/posts'}),
  schema: z.object({
    title: z.string(),
    shortTitle: z.string().optional(),
    ogBackground: z.enum(['doggo', 'sit', 'walk']).optional(),
    description: z.string(),
    published: z.boolean().default(false),
    unlisted: z.boolean().default(false),
    tags: z.string().array().default([]),
    date: z.coerce.date(),
    sup: z.string().optional(),
  }),
})

const tags = defineCollection({
  loader: file('../../notes/tags.yml'),
  schema: z.object({
    name: z.string(),
  }),
})

const projects = defineCollection({
  loader: glob({pattern: '**/*.{md,mdx}', base: '../../notes/projects'}),
  schema: ({image}) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      redirect: z.string().url().optional(),
      unlisted: z.boolean().default(false),
      image: z
        .object({
          light: image(),
          dark: image(),
        })
        .optional(),
    }),
})

const perusal = defineCollection({
  loader: glob({pattern: '**/*.{md,mdx}', base: '../../notes/perusal'}),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    author: z.string().optional(),
    url: z.string().url().optional(),
  }),
})

const notes = defineCollection({
  loader: glob({pattern: '**/*.{md,mdx}', base: '../../notes/uncategorized'}),
  schema: z.object({
    title: z.string(),
    shortTitle: z.string().optional(),
    ogBackground: z.enum(['doggo', 'sit', 'walk']).optional(),
    description: z.string(),
    published: z.boolean().default(false),
    unlisted: z.boolean().default(false),
    tags: z.string().array().default([]),
    date: z.coerce.date(),
    sup: z.string().optional(),
  }),
})

const micro = defineCollection({
  loader: glob({pattern: '**/*.{md,mdx}', base: '../../notes/micro'}),
  schema: z.object({
    status: z
      .object({
        icon: z.string().optional(),
        text: z.string().optional(),
        color: z.enum(['gray', 'red', 'green', 'yellow', 'orange', 'blue']),
      })
      .optional(),
    date: z.coerce.date(),
  }),
})

export const collections = {website, posts, tags, projects, perusal, notes, micro}
