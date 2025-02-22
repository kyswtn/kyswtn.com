import {useThree} from '@react-three/fiber'
import {useGesture} from '@use-gesture/react'
import {type RefObject, useRef} from 'react'
import * as THREE from 'three'

const dragPlane = new THREE.Plane()
const cursorPosition2d = new THREE.Vector2()
const cursorPosition3d = new THREE.Vector3()

type UseOnDragOptions = {
  intersectingRef: RefObject<{children: THREE.Object3D[]} | THREE.Object3D>
  planeNormal: THREE.Vector3
  onDragStart?: (dragHandle: THREE.Object3D) => void
  onDrag?: (dragHandle: THREE.Object3D) => void
  onDragEnd?: (dragHandle: THREE.Object3D) => void
}

export function useRaycastedOnDrag(options: UseOnDragOptions) {
  const {size, raycaster, camera} = useThree()
  const activeDragHandle = useRef<THREE.Object3D>()
  const bindGestures = useGesture(
    {
      onDragStart: ({xy: [x, y], intentional}) => {
        // If displacement < threshold, don't move.
        if (!intentional) return

        // If there's no object to intersect with, do nothing.
        if (!options.intersectingRef.current) return
        const intersectingObjects =
          'children' in options.intersectingRef.current
            ? options.intersectingRef.current.children
            : [options.intersectingRef.current]

        // Raycast and find intersected object.
        cursorPosition2d.set(x, y)
        raycaster.setFromCamera(cursorPosition2d, camera)
        const intersection = raycaster.intersectObjects(intersectingObjects)[0]
        if (!intersection) return

        // Set dragPlane in the position of dragged object.
        const dragHandle = intersection.object
        dragPlane.setFromNormalAndCoplanarPoint(options.planeNormal, dragHandle.position)
        document.body.style.cursor = 'grabbing'

        // Set active drag triple.
        activeDragHandle.current = dragHandle
        options.onDragStart?.(dragHandle)
      },
      onDrag: ({xy: [x, y]}) => {
        if (activeDragHandle.current === undefined) return
        const dragHandle = activeDragHandle.current

        // Get cursor position on drag plane.
        cursorPosition2d.set(x, y)
        raycaster.setFromCamera(cursorPosition2d, camera)
        raycaster.ray.intersectPlane(dragPlane, cursorPosition3d)

        // Update dragHandle's position.
        dragHandle.position.set(cursorPosition3d.x, cursorPosition3d.y, cursorPosition3d.z)
        options.onDrag?.(dragHandle)
      },
      onDragEnd: () => {
        if (!activeDragHandle.current) return

        options.onDragEnd?.(activeDragHandle.current)
        activeDragHandle.current = undefined
        document.body.style.cursor = 'auto'
      },
    },
    {
      drag: {
        // Only trigger onDrag when the user drags.
        filterTaps: true,
        // Only trigger onDrag when the user drag the mesh enough to shift a pixel.
        threshold: 1,
      },
      transform: (vec2) => {
        // Turn cursor position to Normalized Device Coordinates so that raycaster can use.
        // Basically given [0, screenWidth] range, turn it into [-1, 1] range.
        const [x, y] = vec2
        const normalX = ((x - size.left) / size.width) * 2 - 1
        const normalY = -((y - size.top) / size.height) * 2 + 1
        return [normalX, normalY]
      },
    },
  )

  return bindGestures
}
