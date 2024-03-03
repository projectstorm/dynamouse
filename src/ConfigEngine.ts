import * as storage from 'electron-json-storage';
import { BaseObserver } from './BaseObserver';
import { Logger } from 'winston';

export interface Config {
  devices: {
    [key: string]: {
      display: string;
    };
  };
  startupDelay: number;
  logFile: boolean;
}

export interface ConfigEngineListener {
  configChanged: (changedConfig: Partial<Config>) => any;
}

export interface ConfigEngineOptions {
  logger: Logger;
}

export class ConfigEngine extends BaseObserver<ConfigEngineListener> {
  static VERSION = 2;
  static KEY = 'dynamouse';

  config: Config;
  protected logger: Logger;

  constructor(protected options: ConfigEngineOptions) {
    super();
    this.logger = options.logger.child({ namespace: 'CONFIG' });
    this.config = { devices: {}, startupDelay: 0, logFile: false };
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

  async update(config: Partial<Config>) {
    this.config = {
      ...this.config,
      ...config
    };
    await new Promise<void>((resolve, reject) => {
      storage.set(this.saveKey, this.config, (err) => {
        if (err) {
          this.logger.error('failed to store settings', err);
          return reject(err);
        }
        resolve();
      });
    });
    this.logger.debug(`Config updated`, this.config);
    this.iterateListeners((cb) => cb.configChanged?.(config));
  }
}
