import { useEffect, useState } from 'react';
import * as THREE from "three";
import { EXRLoader, GLTFLoader, RGBELoader } from 'three/examples/jsm/Addons.js';
import { Bedmodel } from '../../three/bed-model';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';



export default function BedModelView() {
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [cameraConfig, setCameraConfig] = useState<{
    position: [number, number, number];
    fov: number;
    near: number;
    far: number;
  }>({
    position: [100, -40, 50], // Default camera position
    fov: 30,
    near: 0.1,
    far: 1000,
  });

  useEffect(() => {
    const path = "/bed/bed-model.gltf";
    const loader = new GLTFLoader();

    const loadModel = async () => {
      try {
        const loadedData = await loader.loadAsync(path);
        const tempScene = new THREE.Scene();

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
        const skyTexture = new RGBELoader().load('/bed/sky.hdr');
        skyTexture.mapping = THREE.EquirectangularReflectionMapping;
        tempScene.background = skyTexture;
        tempScene.environment = skyTexture;

        console.log("scene:", tempScene);
        setScene(tempScene);
      } catch (error) {
        console.error("Error loading GLTF model:", error);
      }
    };

    loadModel();
  }, []);

  if (!scene) {
    // Render spinner while the scene is loading
    return (
      <div className="w-full h-full flex items-center justify-center">
        <svg className="animate-spin h-5 w-5 mr-3 ..." viewBox="0 0 24 24">  </svg>
      </div>
    );
  }

  return <Canvas
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
      <Bedmodel />
      <OrbitControls enableZoom={true} enableRotate={true} enablePan={true} />
    </Canvas>
}