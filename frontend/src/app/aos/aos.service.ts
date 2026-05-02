import { Injectable } from '@angular/core';
import AOS from 'aos';

export type AosGlobalConfig = {
  duration?: number;
  easing?: string;
  offset?: number;
  delay?: number;
  once?: boolean;
};

@Injectable({ providedIn: 'root' })
export class AosService {
  private initialized = false;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  init(config: AosGlobalConfig = {}): void {
    if (this.initialized) return;
    this.initialized = true;

    AOS.init({
      duration: config.duration ?? 700,
      easing: config.easing ?? 'ease-out-quart',
      offset: config.offset ?? 80,
      delay: config.delay ?? 0,
      once: config.once ?? true,
      disable: () => window.innerWidth < 768,
      debounceDelay: 50,
      throttleDelay: 99
    });

    setTimeout(() => this.refreshHard(), 0);
  }

  refresh(): void {
    if (!this.initialized) return;
    if (this.refreshTimer) return;
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      try {
        AOS.refresh();
      } catch {
        return;
      }
    }, 50);
  }

  refreshHard(): void {
    if (!this.initialized) return;
    try {
      AOS.refreshHard();
    } catch {
      return;
    }
  }
}
