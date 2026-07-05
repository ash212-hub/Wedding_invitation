import { useMemo } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";

/*
GradientText — drop-in replacement for drei's <Text>, with a top-to-bottom
color gradient instead of a flat color.

Fixed version: troika-three-text has an official extension point for this —
passing a custom material via the `material` prop. Troika then composes its
own glyph-alpha shader logic ON TOP of whatever material you give it. The
previous approach tried to patch `mesh.material.onBeforeCompile` after the
fact, which conflicted with troika's own internal material pipeline and
silently got dropped, leaving default white text. This version avoids that
entirely by using the supported hook.

Usage is identical to before:
  <GradientText colorTop="#000000" colorBottom="#2563eb" fontSize={0.7} ...>
    Rama
  </GradientText>
*/

export default function GradientText({
    colorTop = "#3E5C76 ",
    colorBottom = "#2E6DA4 ",
    fontSize = 1,
    ...props
}) {
    // Approx vertical extent of a line of glyphs around the baseline —
    // good enough to spread the gradient across the visible letterforms
    // without needing to wait on geometry/bounding-box sync timing.
    const halfHeight = fontSize * 0.6;

    const material = useMemo(() => {
        const mat = new THREE.MeshBasicMaterial({
            color: "white",
            transparent: true,
        });

        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uColorTop = { value: new THREE.Color(colorTop) };
            shader.uniforms.uColorBottom = { value: new THREE.Color(colorBottom) };
            shader.uniforms.uMinY = { value: -halfHeight };
            shader.uniforms.uMaxY = { value: halfHeight };

            shader.vertexShader = shader.vertexShader
                .replace(
                    "#include <common>",
                    `#include <common>\nvarying float vGradY;`
                )
                .replace(
                    "#include <begin_vertex>",
                    `#include <begin_vertex>\nvGradY = position.y;`
                );

            shader.fragmentShader = shader.fragmentShader
                .replace(
                    "#include <common>",
                    `#include <common>\nuniform vec3 uColorTop;\nuniform vec3 uColorBottom;\nuniform float uMinY;\nuniform float uMaxY;\nvarying float vGradY;`
                )
                .replace(
                    "vec4 diffuseColor = vec4( diffuse, opacity );",
                    `float gradT = clamp((vGradY - uMinY) / max(uMaxY - uMinY, 0.0001), 0.0, 1.0);
                     vec3 gradColor = mix(uColorBottom, uColorTop, gradT);
                     vec4 diffuseColor = vec4( gradColor, opacity );`
                );
        };

        return mat;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colorTop, colorBottom, halfHeight]);

    return <Text material={material} fontSize={fontSize} {...props} />;
}