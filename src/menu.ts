import { app, Menu, MenuItem, Tray } from 'electron';
import { DisplayEngine } from './DisplayEngine';
import { PointerDevice, PointerEngine } from './PointerEngine';
import { ConfigEngine } from './ConfigEngine';
import AutoLaunch from 'auto-launch';

export interface BuildMenuOptions {
  autolauncher: AutoLaunch;
  pointerEngine: PointerEngine;
  displayEngine: DisplayEngine;
  configEngine: ConfigEngine;
  assignDisplayToDevice: (screen: string, device: PointerDevice) => any;
  tray: Tray;
}

export const buildLoadingMenu = (options: { tray: Tray; message?: string }) => {
  const { tray, message } = options;
  const menu = new Menu();
  menu.append(
    new MenuItem({
      type: 'normal',
      label: message || 'loading...'
    })
  );
  tray.setContextMenu(menu);
  return menu;
};

export const buildMenu = async (options: BuildMenuOptions) => {
  const { autolauncher, pointerEngine, displayEngine, configEngine, assignDisplayToDevice, tray } = options;
  const rebuildMenu = () => {
    setTimeout(() => {
      buildMenu(options);
    }, 100);
  };

  // set temp menu while loading the autolaunch options (it can take a while initially)
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

  // !--------------- STARTUP ----------------

  menu.append(new MenuItem({ type: 'separator' }));
  const startupMenu = new Menu();
  startupMenu.append(
    new MenuItem({
      label: 'Enabled',
      checked: autoLaunchEnabled,
      click: async () => {
        if (autoLaunchEnabled) {
          await autolauncher.disable();
        } else {
          await autolauncher.enable();
        }
        rebuildMenu();
      }
    })
  );
  startupMenu.append(new MenuItem({ type: 'separator' }));

  const currentDelay = configEngine.config.startupDelay || 0;
  let intervals = [0, 2, 5, 10];
  intervals.forEach((i) => {
    startupMenu.append(
      new MenuItem({
        label: `Startup delay ${i}s`,
        type: 'checkbox',
        checked: i == currentDelay,
        click: async () => {
          configEngine.update({
            startupDelay: i
          });
          rebuildMenu();
        }
      })
    );
  });

  menu.append(
    new MenuItem({
      label: 'Launch on startup',
      submenu: startupMenu
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
