import { Device, devices, HID } from 'node-hid';
import { BaseObserver } from './BaseObserver';
import { usb } from 'usb';
import * as _ from 'lodash';
import { Logger } from 'winston';

export interface PointerDeviceListener {
  moved: () => any;
  detached: () => any;
}

export interface PointerDeviceOptions {
  device: Device;
  logger: Logger;
}

export class PointerDevice extends BaseObserver<PointerDeviceListener> {
  resource: HID;
  logger: Logger;
  private dispose: () => any;

  constructor(protected options: PointerDeviceOptions) {
    super();
    this.logger = options.logger.child({ namespace: options.device.product });
  }

  async connect() {
    this.logger.info(`Connecting`);
    this.resource = new HID(this.device.path);

    const data_cb = () => {
      this.iterateListeners((cb) => cb.moved?.());
    };
    const error_cb = (err) => {
      this.logger.error(err);
      // do nothing for now
    };
    this.resource.on('error', error_cb);
    this.resource.on('data', data_cb);
    this.dispose = () => {
      this.resource?.off('error', error_cb);
      this.resource?.off('data', data_cb);
      this.dispose = null;
    };
  }

  async detach() {
    this.logger.info('Detaching');
    this.dispose?.();
    if (this.resource) {
      await this.disconnect();
    }
    this.iterateListeners((cb) => cb.detached?.());
  }

  async disconnect() {
    if (!this.resource) {
      return;
    }
    this.logger.info('Disconnecting');
    try {
      this.resource.close();
    } catch (ex) {}
    this.resource = null;
  }

  get device() {
    return this.options.device;
  }

  get sn() {
    return this.device.serialNumber;
  }

  get product() {
    return this.device.product;
  }
}

export interface PointerEngineListener {
  devicesChanged: () => any;
}

export interface PointerEngineOptions {
  logger: Logger;
}

export class PointerEngine extends BaseObserver<PointerEngineListener> {
  _devices: Set<PointerDevice>;
  logger: Logger;

  constructor(protected options: PointerEngineOptions) {
    super();
    this._devices = new Set();
    this.logger = options.logger.child({ namespace: 'POINTERS' });
  }

  async dispose() {
    await Promise.all(
      this.getDevices().map((d) => {
        return d.disconnect();
      })
    );
  }

  refreshDeviceList() {
    this.logger.info('Refreshing device list');
    let pointerDevices = _.filter(devices(), (d) => d.usage === 2 && d.usagePage === 1);
    let unique = _.uniqBy(pointerDevices, (u) => u.serialNumber);

    const snMapper = (a: PointerDevice | Device) => {
      if (a instanceof PointerDevice) {
        return a.sn;
      }
      return (a as Device).serialNumber;
    };

    // devices to remove
    _.differenceBy(this.getDevices(), unique, snMapper).forEach((d) => {
      d.detach();
    });

    // devices to add
    _.differenceBy(unique, this.getDevices(), snMapper).forEach((d) => {
      const device = new PointerDevice({
        device: d,
        logger: this.logger
      });
      const l1 = device.registerListener({
        detached: () => {
          l1();
          this._devices.delete(device);
          this.iterateListeners((cb) => cb.devicesChanged?.());
        }
      });
      this._devices.add(device);
      this.iterateListeners((cb) => cb.devicesChanged?.());
    });
  }

  init() {
    usb.on('attach', () => {
      this.logger.debug('Device attached');
      this.refreshDeviceList();
    });

    usb.on('detach', () => {
      this.logger.debug('Device detached');
      this.refreshDeviceList();
    });
    this.refreshDeviceList();
  }

  getDevices() {
    return Array.from(this._devices.values());
  }

  getDevice(name: string) {
    return this.getDevices().find((d) => d.product === name);
  }

  getDeviceFromSN(sn: string) {
    return this.getDevices().find((d) => d.sn === sn);
  }
}
