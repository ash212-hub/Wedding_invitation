 import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { useTexture, MeshPortalMaterial, Text } from "@react-three/drei";
import * as THREE from "three";

const HALDI_IMAGE = "/ceremony-cards/haldi.png";

export default function HaldiCard({
    position = [0, 0, 0],
    rotationY = 0,
    width = 1.7,
    height = 2.2,
    fadeOpacityRef,
}) {
    const texture = useTexture(HALDI_IMAGE);
    const { camera, gl } = useThree();

    const groupRef = useRef();
    const posterMeshRef = useRef();
    const portalMeshRef = useRef();
    const boxMeshRef = useRef();
    const posterMatRef = useRef();
    const portalMatRef = useRef();

    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!texture.image) return;
        const imageAspect = texture.image.width / texture.image.height;
        const planeAspect = width / height;

        if (imageAspect > planeAspect) {
            const scale = planeAspect / imageAspect;
            texture.repeat.set(scale, 1);
            texture.offset.set((1 - scale) / 2, 0);
        } else {
            const scale = imageAspect / planeAspect;
            texture.repeat.set(1, scale);
            texture.offset.set(0, (1 - scale) / 2);
        }
        texture.needsUpdate = true;
    }, [texture, width, height]);

    // --- Manual raycast click handling ---
    // ScrollControls' HTML overlay intercepts pointer events before R3F's
    // built-in onClick ever fires on in-scene meshes, so we raycast manually
    // on the canvas's DOM element instead.
    useEffect(() => {
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();

        function handlePointerDown(event) {
            const rect = gl.domElement.getBoundingClientRect();
            pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(pointer, camera);

            // While closed: only the poster is clickable -> opens the portal.
            // While open: only the box is clickable -> closes the portal.
            const target = isOpen ? boxMeshRef.current : posterMeshRef.current;
            if (!target) return;

            const hits = raycaster.intersectObject(target, false);
            if (hits.length > 0) {
                setIsOpen((prev) => !prev);
            }
        }

        gl.domElement.addEventListener("pointerdown", handlePointerDown);
        return () => gl.domElement.removeEventListener("pointerdown", handlePointerDown);
    }, [camera, gl, isOpen]);

    // Fade in/out with scroll — still respected regardless of open/closed state.
    useEffect(() => {
        const id = requestAnimationFrame(function update() {
            const fadeOpacity = fadeOpacityRef?.current ?? 1;
            if (posterMatRef.current) posterMatRef.current.opacity = isOpen ? 0 : fadeOpacity;
            if (portalMatRef.current) portalMatRef.current.blend = isOpen ? 1 : 0;
            if (groupRef.current) groupRef.current.visible = fadeOpacity > 0.01;
            requestAnimationFrame(update);
        });
        return () => cancelAnimationFrame(id);
    }, [isOpen, fadeOpacityRef]);

    return (
        <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
            <mesh ref={posterMeshRef}>
                <planeGeometry args={[width, height]} />
                <meshBasicMaterial
                    ref={posterMatRef}
                    map={texture}
                    transparent
                    opacity={0}
                    toneMapped={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            <mesh ref={portalMeshRef} position={[0, 0, 0.01]}>
                <planeGeometry args={[width, height]} />
                <MeshPortalMaterial ref={portalMatRef} blend={0} side={THREE.DoubleSide}>
                    <ambientLight intensity={0.9} />
                    <directionalLight position={[2, 3, 2]} intensity={1} />
                    <color attach="background" args={["#fff3d1"]} />

                    <Text
                        position={[0, height * 0.32, -0.3]}
                        fontSize={0.18}
                        color="#5a3b00"
                        anchorX="center"
                        anchorY="middle"
                    >
                        Haldi
                    </Text>

                    <mesh ref={boxMeshRef} position={[0, 0, -1]}>
                        <boxGeometry args={[1, 1, 1]} />
                        <meshStandardMaterial color="#f4c542" />
                    </mesh>
                </MeshPortalMaterial>
            </mesh>
        </group>
    );
}