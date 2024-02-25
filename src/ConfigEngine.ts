import * as storage from "electron-json-storage";

export interface Config {
  devices: {
    [key: string]: {
      display: string;
    };
  };
}

export class ConfigEngine {
  static VERSION = 2;
  static KEY = "displaypaws";

  config: Config;

  constructor() {
    this.config = { devices: {} };
  }

  init() {
    const config = storage.getSync(this.saveKey) as Config | null;
    if (config) {
      this.config = config;
    }
  }

  private get saveKey() {
    return `${ConfigEngine.KEY}-${ConfigEngine.VERSION}`;
  }

  update(config: Config) {
    this.config = {
      ...this.config,
      ...config,
    };
    storage.set(this.saveKey, this.config, (err) => {
      if (err) {
        console.error("failed to store settings", err);
      }
    });
  }
}
