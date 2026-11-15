"use client";
import { useEffect, useRef } from "react";

interface AvatarSceneProps {
  modelUrl: string;
  animatorRef: React.MutableRefObject<import("./useAvatarAnimator").AvatarAnimatorRef>;
  onLoaded?: (bones: Record<string, import("three").Bone>) => void;
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

    let cancelled = false;
    let rafId: number;
    let renderer: import("three").WebGLRenderer | null = null;

    const init = async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");

      if (cancelled || !containerRef.current) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x111111);

      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      camera.position.set(0, 1.4, 1.2);
      camera.lookAt(0, 1.1, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      containerRef.current.appendChild(renderer.domElement);

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(ambientLight);
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
      dirLight.position.set(1, 3, 2);
      scene.add(dirLight);
      const fillLight = new THREE.DirectionalLight(0x8888ff, 0.5);
      fillLight.position.set(-2, 1, -1);
      scene.add(fillLight);

      // Load GLB
      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          if (cancelled) return;
          scene.add(gltf.scene);

          // Auto-fit model to view
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          gltf.scene.position.sub(center);
          gltf.scene.position.y += size.y / 2;

          // Collect bones (using any to avoid dynamic import namespace issues)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bones: Record<string, any> = {};
          gltf.scene.traverse((child) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((child as any).isBone) {
              bones[child.name] = child;
            }
          });

          // Set rest pose (arms relaxed at sides)
          if (bones["mixamorigLeftArm"]) bones["mixamorigLeftArm"].rotation.z = -Math.PI / 3;
          if (bones["mixamorigRightArm"]) bones["mixamorigRightArm"].rotation.z = Math.PI / 3;
          if (bones["mixamorigLeftForeArm"]) bones["mixamorigLeftForeArm"].rotation.y = -Math.PI / 1.5;
          if (bones["mixamorigRightForeArm"]) bones["mixamorigRightForeArm"].rotation.y = Math.PI / 1.5;

          animatorRef.current.bones = bones;
          onLoaded?.(bones);

          console.log("✅ xbot loaded, bones:", Object.keys(bones).length);
        },
        (progress) => {
          console.log("📦 xbot loading:", Math.round(progress.loaded / (progress.total || 1) * 100) + "%");
        },
        (err) => {
          console.error("❌ xbot load error:", err);
        }
      );

      const renderLoop = () => {
        if (cancelled) return;
        rafId = requestAnimationFrame(renderLoop);
        renderer!.render(scene, camera);
      };
      renderLoop();
    };

    init();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (renderer) {
        renderer.dispose();
        if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(renderer.domElement);
        }
      }
    };
  }, [modelUrl, width, height, animatorRef, onLoaded]);

  return (
    <div
      ref={containerRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: "12px",
        overflow: "hidden",
        display: "block",
        flexShrink: 0,
      }}
    />
  );
}
