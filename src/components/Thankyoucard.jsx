import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

/*
ThankYouCard — simple flat poster, no portal.
  - Cover-fit cropped PNG (like CSS object-fit: cover).
  - Fades in/out based on fadeOpacityRef (written every frame by
    Ceremony.jsx's CeremonyCardSlot) — same fade behavior as the other
    cards, just without the portal open/close mechanism.
*/

const THANK_YOU_IMAGE = "/ceremony-cards/thankyou.png";

export default function ThankYouCard({
    position = [0, 0, 0],
    rotationY = 0,
    width = 1.7,
    height = 2.2,
    fadeOpacityRef,
}) {
    const texture = useTexture(THANK_YOU_IMAGE);
    const meshRef = useRef();
    const matRef = useRef();

    // Cover-fit: crop instead of stretch.
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

    useFrame(() => {
        const fadeOpacity = fadeOpacityRef?.current ?? 1;

        if (matRef.current) {
            matRef.current.opacity = fadeOpacity;
        }
        if (meshRef.current) {
            meshRef.current.visible = fadeOpacity > 0.01;
        }
    });

    return (
        <mesh ref={meshRef} position={position} rotation={[0, rotationY, 0]}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial
                ref={matRef}
                map={texture}
                transparent
                opacity={0}
                toneMapped={false}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}