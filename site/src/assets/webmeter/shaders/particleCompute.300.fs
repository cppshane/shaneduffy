#version 300 es
precision highp float;

#define EPS 0.0001
#define K_VEL_DECAY 0.99

uniform vec2 uResolution;
uniform float uTime;
uniform float uDeltaT;
uniform vec3 uInputPos;
uniform float uKForce;
uniform vec3 uCenterPos;
uniform float uCenterKForce;
uniform sampler2D uTexture0;
uniform sampler2D uTexture1;
uniform sampler2D uTexture2;

layout(location = 0) out vec4 outPos;
layout(location = 1) out vec4 outVel;
layout(location = 2) out vec4 outExtra;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;

  vec3 pos = texture(uTexture0, uv).rgb;
  vec3 vel = texture(uTexture1, uv).rgb;

  vec3 toMouse = uInputPos - pos;
  float toMouseLen = length(toMouse) + EPS;
  vec3 accel = (toMouse / toMouseLen) * uKForce / toMouseLen;

  vec3 toCenter = uCenterPos - pos;
  float toCenterLen = length(toCenter) + EPS;
  accel += (toCenter / toCenterLen) * uCenterKForce / toCenterLen;

  pos += vel * uDeltaT;
  vel = K_VEL_DECAY * vel + accel * uDeltaT;

  outPos = vec4(pos, 1.0);
  outVel = vec4(vel, 1.0);
  outExtra = texture(uTexture2, uv);
}
