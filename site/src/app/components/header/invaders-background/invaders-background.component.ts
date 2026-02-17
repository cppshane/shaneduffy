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

const ROCKET_CHAR = "^";
const ALIEN_FACES = ["°͜°", "°ʖ°", "ʖ°ʖ", "°_°", "͜°͜", "ʖ_ʖ", "(°͜°)", "°▾°"];
const BULLET_CHAR = "|";
const CELL_W = 56;
const CELL_H = 72;

interface Alien {
  x: number;
  y: number;
  speed: number;
  face: string;
}

interface Bullet {
  x: number;
  y: number;
  speed: number;
}

@Component({
  selector: "app-invaders-background",
  templateUrl: "./invaders-background.component.html",
  styleUrls: ["./invaders-background.component.css"],
})
export class InvadersBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild("canvas") canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx: CanvasRenderingContext2D | null = null;
  private animationId = 0;
  private mouseX = 0.5;
  private rocketX = 0.5;
  private aliens: Alien[] = [];
  private bullets: Bullet[] = [];
  private lastShotAt = 0;
  private lastFrameTime = 0;
  private readonly SHOT_COOLDOWN_MS = 180;
  private readonly BULLET_SPEED_PER_SEC = -1.08;
  private readonly MAX_DELTA_SEC = 0.05;
  private score = 0;
  private gameOver = false;
  private gameOverAt = 0;
  private gameStartTime = 0;
  private lastSpawn = 0;
  private readonly MIN_SPAWN_INTERVAL_MS = 450;
  private readonly MAX_SPAWN_INTERVAL_MS = 1400;
  private readonly RAMP_DURATION_MS = 60000;
  private readonly ROCKET_ROW_RATIO = 0.92;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Record<string, unknown>,
    private ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    this.ctx = canvas.getContext("2d");
    this.resize();
    this.gameStartTime = performance.now();
    this.lastSpawn = this.gameStartTime;
    this.ngZone.runOutsideAngular(() => this.animate());
  }

  ngOnDestroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  @HostListener("window:resize")
  resize(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    this.ctx.scale(dpr, dpr);
  }

  @HostListener("document:mousemove", ["$event"])
  onMouseMove(e: MouseEvent): void {
    this.mouseX = e.clientX / window.innerWidth;
  }

  @HostListener("document:click")
  onShoot(): void {
    if (this.gameOver || !this.ctx) return;
    const now = performance.now();
    if (now - this.lastShotAt < this.SHOT_COOLDOWN_MS) return;
    this.bullets.push({
      x: this.rocketX,
      y: this.ROCKET_ROW_RATIO,
      speed: this.BULLET_SPEED_PER_SEC,
    });
    this.lastShotAt = now;
  }

  private animate = (t?: number): void => {
    this.animationId = requestAnimationFrame(this.animate);
    if (!this.ctx) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    if (this.gameOver) {
      if (t !== undefined && t - this.gameOverAt > 2500) {
        this.gameOver = false;
        this.score = 0;
        this.aliens = [];
        this.bullets = [];
        this.gameStartTime = t;
        this.lastSpawn = t;
        this.lastFrameTime = t;
      }
      this.draw(t ?? 0);
      return;
    }

    const now = t ?? performance.now();
    const deltaSec = this.lastFrameTime
      ? Math.min((now - this.lastFrameTime) / 1000, this.MAX_DELTA_SEC)
      : 1 / 60;
    this.lastFrameTime = now;

    this.rocketX += (this.mouseX - this.rocketX) * 0.12;
    this.rocketX = Math.max(0.05, Math.min(0.95, this.rocketX));

    const elapsed = now - this.gameStartTime;
    const ramp = Math.min(1, elapsed / this.RAMP_DURATION_MS);
    const spawnInterval =
      this.MAX_SPAWN_INTERVAL_MS -
      ramp * (this.MAX_SPAWN_INTERVAL_MS - this.MIN_SPAWN_INTERVAL_MS);
    const spawnCount = 1 + Math.floor(ramp * 2.5);

    if (now - this.lastSpawn >= spawnInterval) {
      for (let i = 0; i < spawnCount; i++) {
        this.aliens.push({
          x: Math.random(),
          y: -0.05 - i * 0.03,
          speed: 0.072 + Math.random() * 0.132,
          face: ALIEN_FACES[Math.floor(Math.random() * ALIEN_FACES.length)],
        });
      }
      this.lastSpawn = now;
    }

    for (const b of this.bullets) {
      b.y += b.speed * deltaSec;
    }
    this.bullets = this.bullets.filter((b) => b.y > -0.05);

    const rocketPxX = this.rocketX * w;
    const rocketPxY = this.ROCKET_ROW_RATIO * h;
    const hitRadius = CELL_W * 0.9;

    for (let i = this.aliens.length - 1; i >= 0; i--) {
      const a = this.aliens[i];
      a.y += a.speed * deltaSec;

      const ax = a.x * w;
      const ay = a.y * h;

      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const b = this.bullets[j];
        const bx = b.x * w;
        const by = b.y * h;
        const d = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
        if (d < hitRadius) {
          this.aliens.splice(i, 1);
          this.bullets.splice(j, 1);
          this.score++;
          break;
        }
      }
    }

    for (let i = this.aliens.length - 1; i >= 0; i--) {
      const a = this.aliens[i];
      const ax = a.x * w;
      const ay = a.y * h;
      const dist = Math.sqrt(
        (ax - rocketPxX) ** 2 + (ay - rocketPxY) ** 2
      );
      if (dist < CELL_W * 1.2) {
        this.gameOver = true;
        this.gameOverAt = now;
        break;
      }
      if (a.y > 1.1) {
        this.aliens.splice(i, 1);
        this.score--;
      }
    }

    this.draw(now);
  };

  private draw(now: number): void {
    if (!this.ctx) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.font = `${CELL_H}px monospace`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    if (this.gameOver) {
      const padX = 24;
      const padY = 20;
      this.ctx.textAlign = "right";
      this.ctx.textBaseline = "bottom";
      this.ctx.fillStyle = "rgba(200,80,80,0.95)";
      this.ctx.font = "22px monospace";
      this.ctx.fillText("GAME OVER", w - padX, h - padY - 48);
      this.ctx.font = "14px monospace";
      this.ctx.fillStyle = "rgba(180,180,180,0.9)";
      this.ctx.fillText("restarting...", w - padX, h - padY - 22);
      this.ctx.font = "16px monospace";
      this.ctx.fillStyle = "rgba(200,220,200,0.9)";
      this.ctx.fillText(`Score: ${this.score}`, w - padX, h - padY);
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      return;
    }

    this.ctx.fillStyle = "rgba(100,220,120,0.95)";
    this.ctx.font = `${CELL_H}px monospace`;
    const rx = this.rocketX * w;
    const ry = this.ROCKET_ROW_RATIO * h;
    this.ctx.fillText(ROCKET_CHAR, rx, ry);

    this.ctx.fillStyle = "rgba(255,255,255,0.95)";
    this.ctx.font = `${CELL_H * 0.5}px monospace`;
    for (const a of this.aliens) {
      const ax = a.x * w;
      const ay = a.y * h;
      this.ctx.fillText(a.face, ax, ay);
    }
    this.ctx.font = `${CELL_H}px monospace`;

    this.ctx.fillStyle = "rgba(200,220,255,0.95)";
    this.ctx.font = `${CELL_H * 0.6}px monospace`;
    for (const b of this.bullets) {
      this.ctx.fillText(BULLET_CHAR, b.x * w, b.y * h);
    }

    const padX = 24;
    const padY = 20;
    this.ctx.textAlign = "right";
    this.ctx.textBaseline = "bottom";
    this.ctx.fillStyle = "rgba(200,220,200,0.9)";
    this.ctx.font = "16px monospace";
    this.ctx.fillText(`Score: ${this.score}`, w - padX, h - padY);
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
  }
}
