import fs from 'node:fs'

export default {
  name: 'base64-loader',
  transform(_: unknown, id: string) {
    const [path, query] = id.split('?')
    if (query !== 'base64') return null
    const data = fs.readFileSync(path)
    const base64 = data.toString('base64')
    return `export default '${base64}';`
  },
}
