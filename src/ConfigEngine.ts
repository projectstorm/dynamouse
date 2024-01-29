import * as storage from "electron-json-storage";

export interface Config {
  [key: string]: {
    display: string;
  };
}

export class ConfigEngine {
  static KEY = "displaypaws";

  config: Config;

  constructor() {
    this.config = {};
  }

  init() {
    const config = storage.getSync(ConfigEngine.KEY) as Config | null;
    this.config = config || {};
  }

  update(config: Config) {
    this.config = {
      ...this.config,
      ...config,
    };
    storage.set(ConfigEngine.KEY, this.config, (err) => {
      if (err) {
        console.error("failed to store settings", err);
      }
    });
  }
}
