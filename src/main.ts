require('source-map-support').install();
import { app, Menu, MenuItem, nativeImage, Tray } from 'electron';
import * as path from 'path';
import { DisplayEngine } from './DisplayEngine';
import { PointerDevice, PointerEngine } from './PointerEngine';
import { ConfigEngine } from './ConfigEngine';
import { RobotEngine } from './RobotEngine';
import AutoLaunch from 'auto-launch';
import { createLogger, transports } from 'winston';

const autolauncher = new AutoLaunch({
  name: 'DynaMouse'
});

const icon_mac = nativeImage.createFromPath(path.join(__dirname, '../media/icon-mac.png'));

const logger = createLogger();
logger.add(new transports.Console());

const displayEngine = new DisplayEngine();
const pointerEngine = new PointerEngine({ logger: logger });
const configEngine = new ConfigEngine();
const robotEngine = new RobotEngine({
  displayEngine,
  pointerEngine
});

app.on('ready', () => {
  const tray = new Tray(
    icon_mac.resize({
      width: 16,
      height: 16
    })
  );

  app.dock.hide();

  const setupMovement = () => {
    return robotEngine.setupAssignments(configEngine.config);
  };

  const assignDisplayToDevice = (display_id: string, device: PointerDevice) => {
    configEngine.update({
      devices: {
        ...configEngine.config.devices,
        [device.product]: { display: display_id }
      }
    });
    buildMenu();
    setupMovement();
  };

  const buildMenu = async () => {
    const autoLaunchEnabled = await autolauncher.isEnabled();

    const menu = new Menu();
    pointerEngine.getDevices().forEach((device) => {
      const submenu = new Menu();
      displayEngine.displays.forEach((display) => {
        submenu.append(
          new MenuItem({
            label: display.label,
            type: 'radio',
            checked: configEngine.config.devices?.[device.product]?.display === display.label,
            click: () => {
              assignDisplayToDevice(display.label, device);
            }
          })
        );
      });
      submenu.append(new MenuItem({ type: 'separator' }));
      submenu.append(
        new MenuItem({
          type: 'radio',
          label: 'None (uncontrolled)',
          checked: configEngine.config.devices?.[device.product]?.display == null,
          click: () => {
            assignDisplayToDevice(null, device);
          }
        })
      );

      const deviceMenuItem = new MenuItem({ label: device.product, submenu: submenu });
      menu.append(deviceMenuItem);
    });
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(
      new MenuItem({
        label: 'Launch on startup',
        type: 'checkbox',
        checked: autoLaunchEnabled,
        click: async () => {
          if (autoLaunchEnabled) {
            await autolauncher.disable();
          } else {
            await autolauncher.enable();
          }
          setTimeout(() => {
            buildMenu();
          }, 100);
        }
      })
    );
    menu.append(
      new MenuItem({
        label: 'Quit',
        click: async () => {
          await pointerEngine.dispose();
          app.exit(0);
        }
      })
    );

    tray.setContextMenu(menu);

    return menu;
  };

  configEngine.init();
  pointerEngine.init();
  displayEngine.init();

  pointerEngine.registerListener({
    devicesChanged: () => {
      buildMenu();
      setupMovement();
    }
  });

  buildMenu();
  setupMovement();
});
