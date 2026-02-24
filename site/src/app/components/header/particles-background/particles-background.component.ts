import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  HostListener,
  NgZone,
} from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import * as glm from "gl-matrix";

const PARTICLE_DIM = 1024;
const SHADER_BASE = "assets/webmeter/shaders";

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

class Clock {
  private startTime = 0;
  private oldTime = 0;
  private running = false;

  getDelta(): number {
    if (!this.running) {
      this.startTime = Date.now();
      this.oldTime = this.startTime;
      this.running = true;
    }
    const newTime = Date.now();
    const diff = 0.001 * (newTime - this.oldTime);
    this.oldTime = newTime;
    return diff;
  }
}

interface CameraLike {
  pos: glm.vec3;
  target: glm.vec3;
  up: glm.vec3;
  right: glm.vec3;
  viewMat: glm.mat4;
  projMat: glm.mat4;
  viewProjMat: glm.mat4;
  fov: number;
  aspect: number;
  update(): void;
  getPointOnTargetPlane(u: number, v: number): glm.vec3;
}

class Camera implements CameraLike {
  pos: glm.vec3;
  target: glm.vec3;
  up: glm.vec3;
  right: glm.vec3;
  viewMat: glm.mat4;
  projMat: glm.mat4;
  viewProjMat: glm.mat4;
  fov: number;
  near: number;
  far: number;
  aspect: number;

  constructor(fov: number, near: number, far: number, aspect: number) {
    this.fov = fov;
    this.near = near;
    this.far = far;
    this.aspect = aspect;
    this.pos = [0, 0, 1];
    this.target = [0, 0, 0];
    this.up = [0, 1, 0];
    this.right = [1, 0, 0];
    this.viewMat = glm.mat4.create();
    this.projMat = glm.mat4.create();
    this.viewProjMat = glm.mat4.create();
  }

  update(): void {
    glm.mat4.lookAt(this.viewMat, this.pos, this.target, this.up);
    glm.mat4.perspective(
      this.projMat,
      this.fov * 2,
      this.aspect,
      this.near,
      this.far
    );
    glm.mat4.multiply(this.viewProjMat, this.projMat, this.viewMat);
  }

  getPointOnTargetPlane(u: number, v: number): glm.vec3 {
    const A = glm.vec3.clone(this.right);
    const B = glm.vec3.clone(this.up);
    const C = glm.vec3.create();
    const tanFOV = Math.tan(this.fov);
    glm.vec3.scale(A, A, tanFOV * this.aspect);
    glm.vec3.scale(B, B, tanFOV);
    glm.vec3.subtract(C, this.target, this.pos);
    glm.vec3.normalize(C, C);
    C[0] += (2 * u - 1) * A[0] + (2 * v - 1) * B[0];
    C[1] += (2 * u - 1) * A[1] + (2 * v - 1) * B[1];
    C[2] += (2 * u - 1) * A[2] + (2 * v - 1) * B[2];
    glm.vec3.normalize(C, C);
    const targetVec = glm.vec3.create();
    glm.vec3.subtract(targetVec, this.target, this.pos);
    const targetDist = glm.vec3.length(targetVec);
    const angle = Math.acos(
      glm.vec3.dot(C, targetVec) / (targetDist || 1e-6)
    );
    const scale = targetDist / Math.cos(angle);
    glm.vec3.scale(C, C, scale);
    glm.vec3.add(C, C, this.pos);
    return C;
  }
}

class CameraControls {
  yawAngle = 0;
  pitchAngle = 0;
  radius = 1;
  camera: CameraLike;

  constructor(camera: CameraLike) {
    this.camera = camera;
    this.camera.pos[0] = 0;
    this.camera.pos[1] = 0;
    this.camera.pos[2] = this.radius;
  }

  update(): void {
    const calcPos: glm.vec3 = [
      Math.sin(this.yawAngle),
      0,
      Math.cos(this.yawAngle),
    ];
    this.camera.right[0] = calcPos[2];
    this.camera.right[1] = 0;
    this.camera.right[2] = -calcPos[0];
    const pitchRot = glm.mat4.create();
    glm.mat4.rotate(
      pitchRot,
      pitchRot,
      this.pitchAngle,
      this.camera.right as glm.vec3
    );
    glm.vec3.transformMat4(calcPos, calcPos, pitchRot);
    glm.vec3.scale(calcPos, calcPos, this.radius);
    glm.vec3.add(this.camera.pos, this.camera.target, calcPos);
    glm.vec3.cross(
      this.camera.up,
      calcPos,
      this.camera.right as glm.vec3
    );
    glm.vec3.normalize(this.camera.up, this.camera.up);
  }
}

@Component({
  selector: "app-particles-background",
  templateUrl: "./particles-background.component.html",
  styleUrls: ["./particles-background.component.css"],
})
export class ParticlesBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild("canvas") canvasRef!: ElementRef<HTMLCanvasElement>;

  backgroundColor = "#232526";
  particleColor = "#030311";
  alpha = 0.7;
  gravity = 0.65;
  centerGravity = 2.0;

  private animationId = 0;
  private gl: WebGLRenderingContext | null = null;
  private ext: WEBGL_draw_buffers | null = null;
  private clock = new Clock();
  private camera: Camera | null = null;
  private cameraControls: CameraControls | null = null;
  private mouseX = 0.5;
  private mouseY = 0.5;
  private inputPos: glm.vec3 = [0, 0, 0];
  private timer = 0;
  private fixedTimeRemainder = 0;
  private readonly FIXED_TIME_STEP = 0.02;
  private readonly FIXED_TIME_STEP_MAX = 0.2;

  private fullScreenQuadPos: Float32Array = new Float32Array([
    -1, -1, 0, 1, 1, 0, -1, 1, 0, -1, -1, 0, 1, -1, 0, 1, 1, 0,
  ]);
  private particleUV: Float32Array | null = null;
  private particleUVBuffer: WebGLBuffer | null = null;
  private quadBuffer: WebGLBuffer | null = null;

  private particleComputeBuffers: Array<{
    width: number;
    height: number;
    textures: WebGLTexture[];
    frameBuffer: WebGLFramebuffer;
  }> = [];

  private shaders: {
    particle: {
      program: WebGLProgram;
      attributes: { aUV: number };
      uniforms: {
        uViewProjMat: WebGLUniformLocation | null;
        uColor: WebGLUniformLocation | null;
        uTexture0: WebGLUniformLocation | null;
        uTexture1: WebGLUniformLocation | null;
        uTexture2: WebGLUniformLocation | null;
      };
      uColorValue: [number, number, number, number];
    };
    particleCompute: {
      program: WebGLProgram;
      attributes: { aPosition: number };
      uniforms: {
        uResolution: WebGLUniformLocation | null;
        uTime: WebGLUniformLocation | null;
        uDeltaT: WebGLUniformLocation | null;
        uInputPos: WebGLUniformLocation | null;
        uKForce: WebGLUniformLocation | null;
        uCenterPos: WebGLUniformLocation | null;
        uCenterKForce: WebGLUniformLocation | null;
        uTexture0: WebGLUniformLocation | null;
        uTexture1: WebGLUniformLocation | null;
        uTexture2: WebGLUniformLocation | null;
      };
        uKForceValue: number;
        uCenterKForceValue: number;
        uInputPosValue: glm.vec3;
        uCenterPosValue: glm.vec3;
      };
    particleInit: {
      program: WebGLProgram;
      attributes: { aPosition: number };
      uniforms: { uResolution: WebGLUniformLocation | null };
    };
  } | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Record<string, unknown>,
    private ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this.runParticles(canvas);
  }

  ngOnDestroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  @HostListener("document:mousemove", ["$event"])
  onMouseMove(e: MouseEvent): void {
    this.mouseX = e.clientX / window.innerWidth;
    this.mouseY = 1 - e.clientY / window.innerHeight;
  }

  private async runParticles(canvas: HTMLCanvasElement): Promise<void> {
    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.warn("WebGL not supported");
      return;
    }
    const extDrawBuffers = gl.getExtension("WEBGL_draw_buffers");
    const extFloat = gl.getExtension("OES_texture_float");
    if (!extDrawBuffers || !extFloat) {
      console.warn("Required WebGL extensions not supported");
      return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    const vs = await this.fetchShader("particle.vs");
    const fs = await this.fetchShader("particle.fs");
    const compVs = await this.fetchShader("particleCompute.vs");
    const compFs = await this.fetchShader("particleCompute.fs");
    const initFs = await this.fetchShader("particleInit.fs");
    if (!vs || !fs || !compVs || !compFs || !initFs) return;

    this.gl = gl;
    this.ext = extDrawBuffers;
    this.resize(canvas);
    this.camera = new Camera(
      radians(45),
      0.1,
      1000,
      canvas.width / canvas.height
    );
    this.cameraControls = new CameraControls(this.camera);
    this.cameraControls.radius = 5;

    const particleProgram = this.compileProgram(gl, vs, fs);
    const particleComputeProgram = this.compileProgram(gl, compVs, compFs);
    const particleInitProgram = this.compileProgram(gl, compVs, initFs);

    const rgb = hexToRgb(this.particleColor);
    const uColorValue: [number, number, number, number] = rgb
      ? [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, this.alpha]
      : [0.012, 0.012, 0.067, this.alpha];

    this.shaders = {
      particle: {
        program: particleProgram,
        attributes: {
          aUV: gl.getAttribLocation(particleProgram, "aUV"),
        },
        uniforms: {
          uViewProjMat: gl.getUniformLocation(particleProgram, "uViewProjMat"),
          uColor: gl.getUniformLocation(particleProgram, "uColor"),
          uTexture0: gl.getUniformLocation(particleProgram, "uTexture0"),
          uTexture1: gl.getUniformLocation(particleProgram, "uTexture1"),
          uTexture2: gl.getUniformLocation(particleProgram, "uTexture2"),
        },
        uColorValue,
      },
      particleCompute: {
        program: particleComputeProgram,
        attributes: {
          aPosition: gl.getAttribLocation(particleComputeProgram, "aPosition"),
        },
        uniforms: {
          uResolution: gl.getUniformLocation(
            particleComputeProgram,
            "uResolution"
          ),
          uTime: gl.getUniformLocation(particleComputeProgram, "uTime"),
          uDeltaT: gl.getUniformLocation(particleComputeProgram, "uDeltaT"),
          uInputPos: gl.getUniformLocation(particleComputeProgram, "uInputPos"),
          uKForce: gl.getUniformLocation(particleComputeProgram, "uKForce"),
          uCenterPos: gl.getUniformLocation(
            particleComputeProgram,
            "uCenterPos"
          ),
          uCenterKForce: gl.getUniformLocation(
            particleComputeProgram,
            "uCenterKForce"
          ),
          uTexture0: gl.getUniformLocation(particleComputeProgram, "uTexture0"),
          uTexture1: gl.getUniformLocation(particleComputeProgram, "uTexture1"),
          uTexture2: gl.getUniformLocation(particleComputeProgram, "uTexture2"),
        },
        uKForceValue: this.gravity,
        uCenterKForceValue: this.centerGravity,
        uInputPosValue: [0, 0, 0],
        uCenterPosValue: [0, 0, 0],
      },
      particleInit: {
        program: particleInitProgram,
        attributes: {
          aPosition: gl.getAttribLocation(particleInitProgram, "aPosition"),
        },
        uniforms: {
          uResolution: gl.getUniformLocation(
            particleInitProgram,
            "uResolution"
          ),
        },
      },
    };

    gl.useProgram(particleComputeProgram);
    gl.uniform2f(
      this.shaders.particleCompute.uniforms.uResolution,
      PARTICLE_DIM,
      PARTICLE_DIM
    );
    gl.useProgram(particleInitProgram);
    gl.uniform2f(
      this.shaders.particleInit.uniforms.uResolution,
      PARTICLE_DIM,
      PARTICLE_DIM
    );
    gl.useProgram(null);

    this.initParticleUV(gl);
    this.initQuadBuffer(gl);
    this.initComputeBuffers(gl);
    this.drawParticleInit(gl);
    this.ngZone.runOutsideAngular(() => this.animate(canvas));
  }

  private async fetchShader(name: string): Promise<string | null> {
    try {
      const r = await fetch(`${SHADER_BASE}/${name}`);
      return r.ok ? r.text() : null;
    } catch {
      return null;
    }
  }

  private compileProgram(
    gl: WebGLRenderingContext,
    vsSource: string,
    fsSource: string
  ): WebGLProgram {
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(vs));
      return null!;
    }
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(fs));
      return null!;
    }
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return program;
  }

  private resize(canvas: HTMLCanvasElement): void {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w;
    canvas.height = h;
    if (this.camera) this.camera.aspect = w / h;
  }

  @HostListener("window:resize")
  onResize(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas && this.gl) this.resize(canvas);
  }

  private initParticleUV(gl: WebGLRenderingContext): void {
    const w = PARTICLE_DIM;
    const h = PARTICLE_DIM;
    const uv: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        uv.push(x / w, y / h);
      }
    }
    this.particleUV = new Float32Array(uv);
    this.particleUVBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleUVBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.particleUV, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private initQuadBuffer(gl: WebGLRenderingContext): void {
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.fullScreenQuadPos, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private initComputeBuffers(gl: WebGLRenderingContext): void {
    for (let i = 0; i < 2; i++) {
      const textures: WebGLTexture[] = [];
      for (let t = 0; t < 3; t++) {
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          PARTICLE_DIM,
          PARTICLE_DIM,
          0,
          gl.RGBA,
          gl.FLOAT,
          null
        );
        gl.bindTexture(gl.TEXTURE_2D, null);
        textures.push(tex);
      }
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        this.ext!.COLOR_ATTACHMENT0_WEBGL,
        gl.TEXTURE_2D,
        textures[0],
        0
      );
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        this.ext!.COLOR_ATTACHMENT1_WEBGL,
        gl.TEXTURE_2D,
        textures[1],
        0
      );
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        this.ext!.COLOR_ATTACHMENT2_WEBGL,
        gl.TEXTURE_2D,
        textures[2],
        0
      );
      this.ext!.drawBuffersWEBGL([
        this.ext!.COLOR_ATTACHMENT0_WEBGL,
        this.ext!.COLOR_ATTACHMENT1_WEBGL,
        this.ext!.COLOR_ATTACHMENT2_WEBGL,
      ]);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.particleComputeBuffers.push({
        width: PARTICLE_DIM,
        height: PARTICLE_DIM,
        textures,
        frameBuffer: fb,
      });
    }
  }

  private drawParticleInit(gl: WebGLRenderingContext): void {
    const buf = this.particleComputeBuffers[0];
    const s = this.shaders!.particleInit;
    gl.bindFramebuffer(gl.FRAMEBUFFER, buf.frameBuffer);
    gl.viewport(0, 0, buf.width, buf.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ZERO);
    gl.useProgram(s.program);
    gl.enableVertexAttribArray(s.attributes.aPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.vertexAttribPointer(s.attributes.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(s.attributes.aPosition);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private simulate(gl: WebGLRenderingContext, deltaT: number): void {
    const s = this.shaders!.particleCompute;
    this.timer += deltaT;
    s.uInputPosValue[0] = this.inputPos[0];
    s.uInputPosValue[1] = this.inputPos[1];
    s.uInputPosValue[2] = this.inputPos[2];
    gl.useProgram(s.program);
    gl.uniform1f(s.uniforms.uTime, this.timer);
    gl.uniform1f(s.uniforms.uDeltaT, deltaT);
    gl.uniform3f(
      s.uniforms.uInputPos!,
      s.uInputPosValue[0],
      s.uInputPosValue[1],
      s.uInputPosValue[2]
    );
    gl.uniform1f(s.uniforms.uKForce, s.uKForceValue);
    gl.uniform3f(
      s.uniforms.uCenterPos!,
      s.uCenterPosValue[0],
      s.uCenterPosValue[1],
      s.uCenterPosValue[2]
    );
    gl.uniform1f(s.uniforms.uCenterKForce!, s.uCenterKForceValue);
    gl.useProgram(null);

    const fromBuf = this.particleComputeBuffers[0];
    const toBuf = this.particleComputeBuffers[1];
    gl.bindFramebuffer(gl.FRAMEBUFFER, toBuf.frameBuffer);
    gl.viewport(0, 0, toBuf.width, toBuf.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ZERO);
    gl.useProgram(s.program);
    gl.enableVertexAttribArray(s.attributes.aPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.vertexAttribPointer(s.attributes.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fromBuf.textures[0]);
    gl.uniform1i(s.uniforms.uTexture0!, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fromBuf.textures[1]);
    gl.uniform1i(s.uniforms.uTexture1!, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, fromBuf.textures[2]);
    gl.uniform1i(s.uniforms.uTexture2!, 2);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(s.attributes.aPosition);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const t = this.particleComputeBuffers[0];
    this.particleComputeBuffers[0] = this.particleComputeBuffers[1];
    this.particleComputeBuffers[1] = t;
  }

  private draw(gl: WebGLRenderingContext): void {
    const buf = this.particleComputeBuffers[0];
    const s = this.shaders!.particle;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.useProgram(s.program);
    gl.uniformMatrix4fv(
      s.uniforms.uViewProjMat,
      false,
      this.camera!.viewProjMat as Float32Array
    );
    gl.uniform4f(
      s.uniforms.uColor!,
      s.uColorValue[0],
      s.uColorValue[1],
      s.uColorValue[2],
      s.uColorValue[3]
    );
    gl.enableVertexAttribArray(s.attributes.aUV);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleUVBuffer);
    gl.vertexAttribPointer(s.attributes.aUV, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, buf.textures[0]);
    gl.uniform1i(s.uniforms.uTexture0!, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, buf.textures[1]);
    gl.uniform1i(s.uniforms.uTexture1!, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, buf.textures[2]);
    gl.uniform1i(s.uniforms.uTexture2!, 2);
    gl.drawArrays(gl.POINTS, 0, PARTICLE_DIM * PARTICLE_DIM);
    gl.disableVertexAttribArray(s.attributes.aUV);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.useProgram(null);
  }

  private animate = (canvas: HTMLCanvasElement): void => {
    this.animationId = requestAnimationFrame(() => this.animate(canvas));
    const gl = this.gl;
    if (!gl || !this.shaders || !this.camera || !this.cameraControls) return;

    const deltaT = this.clock.getDelta();
    this.fixedTimeRemainder = Math.min(
      this.fixedTimeRemainder + deltaT,
      this.FIXED_TIME_STEP_MAX
    );
    while (this.fixedTimeRemainder >= this.FIXED_TIME_STEP) {
      this.simulate(gl, this.FIXED_TIME_STEP);
      this.fixedTimeRemainder -= this.FIXED_TIME_STEP;
    }

    this.cameraControls.update();
    this.camera.update();
    this.inputPos = this.camera.getPointOnTargetPlane(this.mouseX, this.mouseY);
    this.shaders.particleCompute.uInputPosValue[0] = this.inputPos[0];
    this.shaders.particleCompute.uInputPosValue[1] = this.inputPos[1];
    this.shaders.particleCompute.uInputPosValue[2] = this.inputPos[2];
    const centerPos = this.camera.getPointOnTargetPlane(0.5, 0.62);
    this.shaders.particleCompute.uCenterPosValue[0] = centerPos[0];
    this.shaders.particleCompute.uCenterPosValue[1] = centerPos[1];
    this.shaders.particleCompute.uCenterPosValue[2] = centerPos[2];
    this.draw(gl);
  };
}
