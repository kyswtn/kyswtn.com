import type {GroupProps} from '@react-three/fiber'
import {type RapierRigidBody, RigidBody, type RigidBodyProps} from '@react-three/rapier'
import {useCallback, useLayoutEffect, useMemo, useRef} from 'react'
import * as THREE from 'three'
import {useRaycastedOnDrag} from './useRaycastedOnDrag'

const zAxisNormal = new THREE.Vector3(0, 0, 1)
const tmpObject3d = new THREE.Object3D()
const tmpObject3dPosition = new THREE.Vector3()

type ActiveDrag = {
  instanceId: number
  rigidBody: RapierRigidBody
}

type DraggableRigidBodyProps = Partial<RigidBodyProps>

type DraggableInstancedRigidBodiesProps = {
  dragPlaneNormal?: THREE.Vector3
  bodies?: DraggableRigidBodyProps[]
  geometry?: THREE.BufferGeometry
  material?: THREE.Material
}

export default function DraggableInstancedRigidBodies(props: DraggableInstancedRigidBodiesProps) {
  const {dragPlaneNormal = zAxisNormal, bodies = [], geometry, material} = props

  const basicInvisibleMaterial = useMemo(() => new THREE.MeshBasicMaterial({visible: false}), [])
  const dragHandlesGroupRef = useRef<THREE.Group>(null!)
  const dragHandles = useRef<THREE.Mesh[]>([])
  const rigidBodies = useRef<RapierRigidBody[]>([])
  const activeDrag = useRef<ActiveDrag>()
  const bindGestures = useRaycastedOnDrag({
    planeNormal: dragPlaneNormal,
    intersectingRef: dragHandlesGroupRef,
    onDragStart: (dragHandle) => {
      // Set active drag triple.
      const instanceId = dragHandle.userData.index as number
      const rigidBody = rigidBodies.current[instanceId]
      activeDrag.current = {instanceId, rigidBody}

      // Wake rigidBody up to prepare for kinematic translation.
      rigidBody.setBodyType(2, true)
    },
    onDrag: (dragHandle) => {
      if (activeDrag.current === undefined) return
      const {instanceId, rigidBody} = activeDrag.current

      // Update instance's position.
      const {x, y, z} = dragHandle.position
      tmpObject3d.position.set(x, y, z)
      // Since the instance will be moved to new position, there's no need to care about previous
      // position of temporary object, but previous rotation (and scale) must be taken into account.
      tmpObject3d.setRotationFromEuler(dragHandle.rotation)
      tmpObject3d.updateMatrix()
      instancedMeshRef.current.setMatrixAt(instanceId, tmpObject3d.matrix)
      instancedMeshRef.current.instanceMatrix.needsUpdate = true

      // Move linked rigidbody kinematically.
      tmpObject3d.getWorldPosition(tmpObject3dPosition)
      rigidBody.setNextKinematicTranslation(tmpObject3dPosition)
    },
    onDragEnd: () => {
      if (!activeDrag.current) return
      activeDrag.current.rigidBody.setBodyType(0, true)
      activeDrag.current = undefined
    },
  })

  type RigidBodyState = ReturnType<NonNullable<RigidBodyProps['transformState']>>
  const transformRigidBodyState = useCallback((state: RigidBodyState, index: number) => {
    return {
      ...state,
      setMatrix: (matrix) => {
        // Don't sync if the instance is the one being dragged.
        if (activeDrag.current?.instanceId === index) return

        // Sync drag handle.
        const dragHandle = dragHandles.current[index]
        if (dragHandle) {
          dragHandle.position.setFromMatrixPosition(matrix)
          dragHandle.setRotationFromMatrix(matrix)
        }

        // Sync instance.
        instancedMeshRef.current.setMatrixAt(index, matrix)
        instancedMeshRef.current.instanceMatrix.needsUpdate = true
      },
      meshType: 'instancedMesh',
    } as typeof state
  }, [])

  const instancedMeshRef = useRef<THREE.InstancedMesh>(null!)
  useLayoutEffect(() => {
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i]

      // If initial position is specified.
      if (body.position && typeof body.position === 'object' && body.position !== null) {
        const [x, y, z] = body.position
        tmpObject3d.position.set(x, y, z)
      }

      if (body.rotation && typeof body.rotation === 'object' && body.rotation !== null) {
        const [x, y, z] = body.rotation as [number, number, number]
        tmpObject3d.rotation.set(x, y, z)
      }

      tmpObject3d.updateMatrix()
      instancedMeshRef.current.setMatrixAt(i, tmpObject3d.matrix)
    }
    instancedMeshRef.current.instanceMatrix.needsUpdate = true
  }, [bodies])

  return (
    <>
      <instancedMesh
        frustumCulled={false}
        ref={instancedMeshRef}
        args={[geometry, material, bodies.length]}
      />

      <group ref={dragHandlesGroupRef} visible={false} {...(bindGestures() as GroupProps)}>
        {bodies.map((body, index) => (
          <mesh
            key={index}
            userData={{index}}
            position={body.position}
            ref={(dragHandle) => {
              if (dragHandle) dragHandles.current[index] = dragHandle
            }}
            geometry={geometry}
            material={basicInvisibleMaterial}
          />
        ))}
      </group>

      <group>
        {bodies.map((body, index) => (
          <RigidBody
            key={index}
            position={body.position}
            ref={(rigidBody) => {
              if (rigidBody) rigidBodies.current[index] = rigidBody
            }}
            transformState={(state) => transformRigidBodyState(state, index)}
            {...body}
          >
            <mesh geometry={geometry} material={basicInvisibleMaterial} />
          </RigidBody>
        ))}
      </group>
    </>
  )
}
