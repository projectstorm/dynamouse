import { Device, devices, HID, HIDAsync } from "node-hid";
import { BaseObserver } from "./BaseObserver";
import * as _ from "lodash";

export interface PointerDeviceListener {
  moved: () => any;
}

export class PointerDevice extends BaseObserver<PointerDeviceListener> {
  resource: HID;

  constructor(public device: Device) {
    super();
  }

  async connect() {
    console.log("Connecting HID", this.product);
    this.resource = new HID(this.device.path);
    this.resource.on("data", () => {
      this.fire();
    });
  }

  fire() {
    this.iterateListeners((cb) => cb.moved?.());
  }

  async disconnect() {
    if (!this.resource) {
      return;
    }
    console.log("Disconnecting HID: ", this.product);
    this.resource?.close();
    this.resource = null;
  }

  get product() {
    return this.device.product;
  }
}

export class PointerEngine {
  _devices: Map<string, PointerDevice>;

  constructor() {
    this._devices = new Map();
  }

  init() {
    devices()
      .filter((d) => d.usage === 2)
      .forEach((d) => {
        if (!this._devices.has(d.product)) {
          this._devices.set(d.product, new PointerDevice(d));
        }
      });
  }

  getDevices() {
    return Array.from(this._devices.values());
  }

  getDevice(name: string) {
    return this.getDevices().find((d) => d.product === name);
  }
}
