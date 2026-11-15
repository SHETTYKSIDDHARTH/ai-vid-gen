"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { AvatarAnimatorRef } from "./useAvatarAnimator";

interface AvatarSceneProps {
  modelUrl: string;
  animatorRef: React.MutableRefObject<AvatarAnimatorRef>;
  onLoaded?: (bones: Record<string, THREE.Bone>) => void;
  width?: number;
  height?: number;
}

export function AvatarScene({
  modelUrl,
  animatorRef,
  onLoaded,
  width = 260,
  height = 360,
}: AvatarSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 1.3, 0.9);
    camera.lookAt(0, 1.1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const spotLight = new THREE.SpotLight(0xffffff, 1.2);
    spotLight.position.set(0, 3, 2);
    spotLight.target.position.set(0, 1, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);

    // Load model
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        scene.add(gltf.scene);
        const bones: Record<string, THREE.Bone> = {};
        gltf.scene.traverse((child) => {
          if ((child as THREE.Bone).isBone) {
            bones[child.name] = child as THREE.Bone;
          }
        });

        // Default rest pose (arms down at sides)
        if (bones["mixamorigLeftArm"]) bones["mixamorigLeftArm"].rotation.z = -Math.PI / 3;
        if (bones["mixamorigRightArm"]) bones["mixamorigRightArm"].rotation.z = Math.PI / 3;
        if (bones["mixamorigLeftForeArm"]) bones["mixamorigLeftForeArm"].rotation.y = -Math.PI / 1.5;
        if (bones["mixamorigRightForeArm"]) bones["mixamorigRightForeArm"].rotation.y = Math.PI / 1.5;

        animatorRef.current.bones = bones;
        onLoaded?.(bones);
      },
      undefined,
      (err) => console.error("GLTFLoader error:", err)
    );

    let rafId: number;
    const renderLoop = () => {
      rafId = requestAnimationFrame(renderLoop);
      renderer.render(scene, camera);
    };
    renderLoop();

    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      if (
        containerRef.current &&
        renderer.domElement.parentNode === containerRef.current
      ) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl, width, height, animatorRef, onLoaded]);

  return (
    <div
      ref={containerRef}
      style={{ width, height, borderRadius: 12, overflow: "hidden" }}
    />
  );
}
