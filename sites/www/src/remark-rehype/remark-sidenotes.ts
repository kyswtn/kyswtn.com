import 'mdast-util-directive'
import {h} from 'hastscript'
import type {Root} from 'mdast'
import {toHast} from 'mdast-util-to-hast'
import {visit} from 'unist-util-visit'

export function remarkSidenotes() {
  return (tree: Root) => {
    visit(tree, (node) => {
      if (
        node.type === 'containerDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'textDirective'
      ) {
        if (node.name !== 'sidenote') return

        const data = node.data || (node.data = {})
        const classList = node.attributes?.class?.split(' ') ?? []
        classList.unshift(node.name)

        const children = [h('div', {}), h('div', {}), h('div', {class: 'noteside'}, toHast(node))]
        const left = classList.indexOf('left')
        if (left !== -1) {
          children.reverse()
          classList.splice(left, 1)
        }

        const tree = h('aside', {...node.attributes, class: classList.join(' ')}, ...children)
        data.hName = tree.tagName
        data.hProperties = tree.properties
        data.hChildren = tree.children
      }
    })
  }
}
