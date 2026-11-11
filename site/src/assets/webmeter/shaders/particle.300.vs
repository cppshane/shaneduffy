#version 300 es
precision highp float;

in vec2 aUV;

uniform mat4 uViewProjMat;
uniform sampler2D uTexture0;

void main() {
  gl_PointSize = 1.0;
  gl_Position = uViewProjMat * texture(uTexture0, aUV);
}
