import OpenGraph from '@/components/OpenGraph'
import type {Post} from '@/lib/content'
import {getOGImage} from '@/lib/og'
import type {APIRoute} from 'astro'

export {getStaticPaths} from './index.astro'
export const GET: APIRoute<Post> = async ({props}) => {
  return getOGImage(() => OpenGraph({title: props.data.title}))
}
