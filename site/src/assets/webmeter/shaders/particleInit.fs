#extension GL_EXT_draw_buffers : require

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 uResolution;

float rand(vec2 seed) {
  return fract(sin(dot(seed.xy,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy/uResolution.xy;

  vec3 pos = vec3(uv.x, uv.y, rand(uv));
  vec3 vel = vec3(-2.0, 0.0, 0.0);
  vec4 col = vec4(1.0, 0.3, 0.1, 0.5);

  gl_FragData[0] = vec4(pos, 1.0);
  gl_FragData[1] = vec4(vel, 1.0);
  gl_FragData[2] = col;
}
