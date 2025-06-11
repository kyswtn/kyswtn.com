import 'mdast-util-directive'
import {h} from 'hastscript'
import type {Root} from 'mdast'
import {toHast} from 'mdast-util-to-hast'
import {visit} from 'unist-util-visit'

export function remarkSidenotes() {
  return (tree: Root) => {
    visit(tree, (node, index, parent) => {
      if (
        node.type === 'containerDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'textDirective'
      ) {
        if (node.name !== 'sidenote' || !parent || typeof index !== 'number') return

        const data = node.data || (node.data = {})
        const classList = node.attributes?.class?.split(' ') ?? []
        classList.unshift(node.name)

        const children = [h('div', {}), h('div', {}), h('div', {class: 'noteside'}, toHast(node))]
        const left = classList.indexOf('left')
        if (left !== -1) {
          children.reverse()
          classList.splice(left, 1)
        }

        const aside = h('aside', {...node.attributes, class: classList.join(' ')}, ...children)
        const referenced = parent.children[index - 1]
        if (!referenced) return
        parent.children.splice(index - 1, 1) // Delete referenced element.

        const wrapperDiv = h('div', {class: 'with-sidenote'}, [aside, toHast(referenced)])
        data.hName = wrapperDiv.tagName
        data.hProperties = wrapperDiv.properties
        data.hChildren = wrapperDiv.children
      }
    })
  }
}
