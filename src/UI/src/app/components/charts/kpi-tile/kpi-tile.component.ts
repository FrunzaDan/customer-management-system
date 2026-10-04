import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  PLATFORM_ID,
  signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { areaUnder, smoothPath } from '../../../utils/chart-geometry';

const COUNT_UP_MS = 1200;
const SPARK_WIDTH = 120;
const SPARK_HEIGHT = 34;

let nextTileId = 0;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

@Component({
  selector: 'app-kpi-tile',
  templateUrl: './kpi-tile.component.html',
  styleUrl: './kpi-tile.component.css',
})
export class KpiTileComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number | null>();
  readonly valueFormatter = input<(value: number) => string>((value) =>
    Math.round(value).toLocaleString(),
  );
  readonly caption = input<string | null>(null);
  readonly trend = input<number[]>([]);

  readonly id = `kpi-${nextTileId++}`;
  readonly sparkWidth = SPARK_WIDTH;
  readonly sparkHeight = SPARK_HEIGHT;

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly shown = signal(0);
  private frame: number | null = null;

  readonly displayValue = computed(() =>
    this.value() === null ? '—' : this.valueFormatter()(this.shown()),
  );

  readonly finalValue = computed(() => {
    const value = this.value();
    return value === null ? '—' : this.valueFormatter()(value);
  });

  private readonly sparkPoints = computed(() => {
    const trend = this.trend();
    if (trend.length < 2) return [];
    const max = Math.max(...trend);
    const min = Math.min(...trend);
    const range = max - min || 1;
    return trend.map((value, index) => ({
      x: (index / (trend.length - 1)) * SPARK_WIDTH,
      y: SPARK_HEIGHT - 3 - ((value - min) / range) * (SPARK_HEIGHT - 6),
    }));
  });

  readonly sparkLine = computed(() => smoothPath(this.sparkPoints()));
  readonly sparkArea = computed(() =>
    areaUnder(this.sparkPoints(), SPARK_HEIGHT),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelFrame());

    effect(() => {
      const target = this.value() ?? 0;
      untracked(() => this.animateTo(target));
    });
  }

  private animateTo(target: number): void {
    this.cancelFrame();
    const canAnimate =
      this.isBrowser &&
      typeof requestAnimationFrame === 'function' &&
      !prefersReducedMotion();
    if (!canAnimate) {
      this.shown.set(target);
      return;
    }

    const from = this.shown();
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / COUNT_UP_MS, 1);
      this.shown.set(from + (target - from) * easeOutCubic(t));
      this.frame = t < 1 ? requestAnimationFrame(step) : null;
    };
    this.frame = requestAnimationFrame(step);
  }

  private cancelFrame(): void {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }
}
