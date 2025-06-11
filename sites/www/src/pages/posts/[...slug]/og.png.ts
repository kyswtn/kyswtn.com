import type {CollectionEntry} from 'astro:content'
import OGTemplate from '@/components/OGTemplate'
import {getOGImage} from '@/lib/og'
import type {APIRoute} from 'astro'

export {getStaticPaths} from './index.astro'
export const GET: APIRoute<CollectionEntry<'posts'>> = async ({props}) => {
  return getOGImage(() =>
    OGTemplate({
      title: props.data.shortTitle ?? props.data.title,
      background: props.id === 'about' ? 'doggo' : props.data.ogBackground,
    }),
  )
}
