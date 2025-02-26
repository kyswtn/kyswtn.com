import {type GroupProps, useThree} from '@react-three/fiber'
import {
  type RapierRigidBody,
  RigidBody,
  type RigidBodyProps,
  useAfterPhysicsStep,
} from '@react-three/rapier'
import {useGesture} from '@use-gesture/react'
import React, {type ReactElement} from 'react'
import {useRef} from 'react'
import * as THREE from 'three'

const dragPlane = new THREE.Plane()
const cursorPosition2d = new THREE.Vector2()
const cursorPosition3d = new THREE.Vector3()
const zAxisNormal = new THREE.Vector3(0, 0, 1)
const tmpObject3dPosition = new THREE.Vector3()

type DraggableRigidBodyProps = {
  dragPlaneNormal?: THREE.Vector3
  children: React.ReactNode
} & Partial<RigidBodyProps>

/**
 * This is the simplest form of a draggable rigid body. As simple as this is to implement, it has
 * a few problems.
 *
 * 1. More than one body can be dragged overlapped since each component controls it's active state.
 * 2. Using a lot of these will lead to performance issues due to `userAfterPhysicsStep` usage, having
 *    multiple drag event handlers and not instancing meshes.
 *
 * Since the children mesh is cloned and not used as it-is, trying to manipulate the mesh's
 * properties after initial render won't work.
 */
export default function DraggableRigidBody(props: DraggableRigidBodyProps) {
  const {dragPlaneNormal = zAxisNormal, children, ...rigidBodyProps} = props
  const {size, raycaster, camera} = useThree()
  const activeDrag = useRef(false)
  const dragHandleRef = useRef<THREE.Group>(null!)
  const rigidBodyRef = useRef<RapierRigidBody>(null!)
  const meshRef = useRef<THREE.Mesh>(null!)

  const bindGestures = useGesture(
    {
      onDragStart: ({intentional}) => {
        if (!intentional) return
        dragPlane.setFromNormalAndCoplanarPoint(dragPlaneNormal, dragHandleRef.current.position)

        activeDrag.current = true
        rigidBodyRef.current.setBodyType(2, true)
        document.body.style.cursor = 'grabbing'
      },
      onDrag: ({xy: [x, y]}) => {
        if (!activeDrag.current) return

        cursorPosition2d.set(x, y)
        raycaster.setFromCamera(cursorPosition2d, camera)
        raycaster.ray.intersectPlane(dragPlane, cursorPosition3d)

        dragHandleRef.current.position.set(...cursorPosition3d.toArray())
        dragHandleRef.current.getWorldPosition(tmpObject3dPosition)

        rigidBodyRef.current.wakeUp()
        rigidBodyRef.current.setNextKinematicTranslation(tmpObject3dPosition)
      },
      onDragEnd: () => {
        if (!activeDrag.current) return

        activeDrag.current = false
        rigidBodyRef.current.setBodyType(0, true)
        document.body.style.cursor = 'auto'
      },
    },
    {
      drag: {
        filterTaps: true,
        threshold: 1,
      },
      transform: (vec2) => {
        const [x, y] = vec2
        const normalX = ((x - size.left) / size.width) * 2 - 1
        const normalY = -((y - size.top) / size.height) * 2 + 1
        return [normalX, normalY]
      },
    },
  )

  useAfterPhysicsStep(() => {
    const matrix = meshRef.current.matrixWorld
    dragHandleRef.current.position.setFromMatrixPosition(matrix)
    dragHandleRef.current.setRotationFromMatrix(matrix)
  })

  return (
    <>
      <group
        ref={dragHandleRef}
        position={rigidBodyProps.position}
        visible={false}
        {...(bindGestures() as GroupProps)}
      >
        {React.cloneElement(children as unknown as ReactElement, {})}
      </group>
      <RigidBody position={rigidBodyProps.position} {...rigidBodyProps} ref={rigidBodyRef}>
        {React.cloneElement(children as unknown as ReactElement, {ref: meshRef})}
      </RigidBody>
    </>
  )
}
