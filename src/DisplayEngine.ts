import { screen } from 'electron';
import { BaseObserver } from './BaseObserver';
import Display = Electron.Display;

export interface DisplayListener {
  displaysChanged: (displays: Display[]) => any;
}

export class DisplayEngine extends BaseObserver<DisplayListener> {
  displays: Display[];
  constructor() {
    super();
    this.displays = [];
  }

  recompute() {
    this.displays = screen.getAllDisplays();
    this.iterateListeners((cb) => cb.displaysChanged?.(this.displays));
  }

  init() {
    screen.on('display-added', () => {
      this.recompute();
    });
    screen.on('display-removed', () => {
      this.recompute();
    });
    this.recompute();
  }

  getDisplay(name: string) {
    return this.displays.find((d) => d.label === name);
  }
}
