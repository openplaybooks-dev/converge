// Custom GLSL shaders ported verbatim from interactive-low-poly-environment
// (Roberto Nacu, MIT). The NOTICE file covers the lift.
//
// Source: js/main.js lines 45-166 of upstream.

export const FIREFLIES_VS = `
uniform float uPixelRatio;
uniform float uSize;
attribute float aScale;
uniform float uTime;

attribute float rFade;
varying float fFade;

void main()
{
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    modelPosition.y += sin(uTime + modelPosition.x * 0.10) * aScale * 0.8;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;
    gl_PointSize = uSize * uPixelRatio * aScale;
    gl_PointSize *= (100.0 / - viewPosition.z);

    fFade = rFade;
}
`;

export const FIREFLIES_FS = `
varying float fFade;

void main()
{
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    float strength = 0.01 / distanceToCenter - fFade;
    vec3 pointColor = vec3(1.0, 1.0, 0.8);
    gl_FragColor = vec4(pointColor, strength);
}
`;

export const FIRE_VS = `
uniform float uPixelRatio;
uniform float uSize;
attribute float aScale;
attribute vec3 colour;
varying vec4 vColour;
uniform float uTime;

void main()
{
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    modelPosition.y += sin(uTime + modelPosition.x * 100.0)/aScale * 0.5;
    modelPosition.x += sin(uTime + modelPosition.y)/aScale * 0.2;
    modelPosition.z += sin(uTime + modelPosition.x)/aScale * 0.2;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;
    gl_PointSize = uSize * uPixelRatio * aScale;
    gl_PointSize *= (100.0 / - viewPosition.z);

    vColour = vec4(colour, 0.8);
}
`;

export const FIRE_FS = `
uniform sampler2D pointTexture;
varying vec4 vColour;

void main()
{
    vec4 outTexture = texture2D(pointTexture, gl_PointCoord);
    if (outTexture.a < 0.5) discard;
    gl_FragColor = outTexture * vColour;
}
`;
