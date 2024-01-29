import { app, Menu, MenuItem, nativeImage, Tray } from "electron";
import * as path from "path";
import { DisplayEngine } from "./DisplayEngine";
import { PointerDevice, PointerEngine } from "./PointerEngine";
import { ConfigEngine } from "./ConfigEngine";
import { RobotEngine } from "./RobotEngine";

const icon_mac = nativeImage.createFromPath(path.join(__dirname, "../media/icon-mac.png"));

const displayEngine = new DisplayEngine();
const pointerEngine = new PointerEngine();
const configEngine = new ConfigEngine();
const robotEngine = new RobotEngine({
  displayEngine,
  pointerEngine,
});

app.on("ready", () => {
  const tray = new Tray(
    icon_mac.resize({
      width: 16,
      height: 16,
    }),
  );


  const setupMovement = () => {
    return robotEngine.setupAssignments(configEngine.config);
  };

  const assignDisplayToDevice = (display_id: string, device: PointerDevice) => {
    configEngine.update({
      [device.product]: { display: display_id },
    });
    tray.setContextMenu(buildMenu());
    setupMovement();
  };

  const buildMenu = () => {
    const menu = new Menu();
    pointerEngine.getDevices().forEach((device) => {
      const submenu = new Menu();
      displayEngine.displays.forEach((display) => {
        submenu.append(
          new MenuItem({
            label: display.label,
            type: "radio",
            checked: configEngine.config[device.product]?.display === display.label,
            click: () => {
              assignDisplayToDevice(display.label, device);
            },
          }),
        );
      });
      submenu.append(new MenuItem({ type: "separator" }));
      submenu.append(
        new MenuItem({
          type: "radio",
          label: "None (uncontrolled)",
          checked: configEngine.config[device.product]?.display == null,
          click: () => {
            assignDisplayToDevice(null, device);
          },
        }),
      );

      const deviceMenuItem = new MenuItem({ label: device.product, submenu: submenu });
      menu.append(deviceMenuItem);
    });
    return menu;
  };

  configEngine.init();
  pointerEngine.init();
  displayEngine.init();
  tray.setContextMenu(buildMenu());
  setupMovement();



});
