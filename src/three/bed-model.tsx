import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from "three";

const link = '/bed/bed-model.gltf';

export function Bedmodel(props) {
  const groupRef = useRef()

  const { nodes, materials } = useGLTF(link)
  console.log('nodes: ', nodes);
  return (
    <group  {...props} dispose={null}>
      <group position={[-18.556, -0.107, 10.792]} scale={0.1}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Mesh_3.geometry}
          material={new THREE.MeshStandardMaterial({ color: 0xff6347 })}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Mesh_3_1.geometry}
          material={materials['#CDA367FF']}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Mesh_3_2.geometry}
          material={materials['#A3E2EDFF']}
        />
      </group>
    </group>
  )
}

useGLTF.preload(link);