import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { useTexture, MeshPortalMaterial } from "@react-three/drei";
import * as THREE from "three";

const SANGEET_IMAGE = "/ceremony-cards/sangeet.png";

export default function SangeetCard({
    position = [0, 0, 0],
    rotationY = 0,
    width = 1.7,
    height = 2.2,
    fadeOpacityRef,
}) {
    const texture = useTexture(SANGEET_IMAGE);
    const { camera, gl } = useThree();

    const groupRef = useRef();
    const posterMeshRef = useRef();
    const portalMeshRef = useRef();
    const boxMeshRef = useRef();
    const posterMatRef = useRef();
    const portalMatRef = useRef();

    const [isOpen, setIsOpen] = useState(false);

    // Cover-fit: crop instead of stretch, like CSS object-fit: cover.
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
            {/* Flat poster */}
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

            {/* Portal — Sangeet's own scene, independent of other cards */}
            <mesh ref={portalMeshRef} position={[0, 0, 0.01]}>
                <planeGeometry args={[width, height]} />
                <MeshPortalMaterial ref={portalMatRef} blend={0} side={THREE.DoubleSide}>
                    <ambientLight intensity={0.9} />
                    <directionalLight position={[2, 3, 2]} intensity={1} />
                    <color attach="background" args={["#f6dceb"]} /> {/* festive pink/magenta tone */}

                    <mesh ref={boxMeshRef} position={[0, 0, -1]}>
                        <boxGeometry args={[1, 1, 1]} />
                        <meshStandardMaterial color="#d6549e" />
                    </mesh>
                </MeshPortalMaterial>
            </mesh>
        </group>
    );
}