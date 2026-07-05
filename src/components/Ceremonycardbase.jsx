import { forwardRef, useMemo, useEffect } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

const CeremonyCardBase = forwardRef(function CeremonyCardBase(
    {
        imageUrl,
        position = [0, 0, 0],
        rotationY = 0,
        width = 3,
        height = 4,
    },
    ref
) {
    const texture = useTexture(imageUrl);

    // Cover-fit: adjust texture repeat/offset so the image fills the plane
    // without stretching, cropping instead — like CSS object-fit: cover.
    useEffect(() => {
        if (!texture.image) return;

        const imageAspect = texture.image.width / texture.image.height;
        const planeAspect = width / height;

        if (imageAspect > planeAspect) {
            // image wider than plane -> crop left/right
            const scale = planeAspect / imageAspect;
            texture.repeat.set(scale, 1);
            texture.offset.set((1 - scale) / 2, 0);
        } else {
            // image taller than plane -> crop top/bottom
            const scale = imageAspect / planeAspect;
            texture.repeat.set(1, scale);
            texture.offset.set(0, (1 - scale) / 2);
        }
        texture.needsUpdate = true;
    }, [texture, width, height]);

    return (
        <mesh ref={ref} position={position} rotation={[0, rotationY, 0]}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial
                map={texture}
                transparent
                opacity={0}
                toneMapped={false}
                side={2}
            />
        </mesh>
    );
});

export default CeremonyCardBase;