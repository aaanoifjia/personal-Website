import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import * as THREE from "three";
import React, { useState, useEffect } from "react";
import { Bedmodel } from './bed-model';

function Model(){
  
}

const ModelViewer: React.FC = () => {
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [cameraConfig, setCameraConfig] = useState<{
    position: [number, number, number];
    fov: number;
    near: number;
    far: number;
  }>({
    position: [0, 0, 5], // Default camera position
    fov: 30,
    near: 0.1,
    far: 1000,
  });

  useEffect(() => {
    const path = "/bed/scene-6.gltf";
    const loader = new GLTFLoader();

    const loadModel = async () => {
      try {
        const loadedData = await loader.loadAsync(path);
        const tempScene = new THREE.Scene();

        // Load the first geometry and create a model
        console.log(loadedData.scene.children)
        loadedData.scene.traverse((child) => {
          const geometry = (child as THREE.Mesh).geometry;
          const material = new THREE.MeshStandardMaterial({ color: 0xff6347 });
          const model = new THREE.Mesh(geometry, material);
          tempScene.add(model);
          model.position.set(-200, 0, 60)
        })

        const lightHelper = new THREE.PointLightHelper(pointLight)
        const gridHelper = new THREE.GridHelper(200, 50);
        tempScene.add(lightHelper, gridHelper)

        // Configure the camera
        const { cameras } = loadedData;
        if (cameras && cameras.length > 0) {
          const camera = cameras[0];
          setCameraConfig({
            position: camera.position.toArray() as [number, number, number],
            fov: 30,
            near: 0.1,
            far: 1000,
          });
        } else {
          console.error("No camera found in the scene. Using default camera.");
        }
        console.log(tempScene)
        setScene(tempScene);
      } catch (error) {
        console.error("Error loading GLTF model:", error);
      }
    };

    loadModel();
  }, []);

  return (
    <Canvas
      className="w-full h-full"
      fallback={<div>Sorry, WebGL not supported!</div>}
      camera={{
        position: cameraConfig.position,
        fov: cameraConfig.fov,
        near: cameraConfig.near,
        far: cameraConfig.far,
      }}
      scene={scene}
    >
      <ambientLight intensity={Math.PI / 2} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
      <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
      <Bedmodel/>
      <OrbitControls enableZoom={true} enableRotate={true} enablePan={true} />
    </Canvas>
  );
};

export default ModelViewer;
