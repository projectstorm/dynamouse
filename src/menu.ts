import { Menu, MenuItem, Tray } from 'electron';
import { DisplayEngine } from './DisplayEngine';
import { PointerEngine } from './PointerEngine';
import { ConfigEngine } from './ConfigEngine';
import AutoLaunch from 'auto-launch';

export interface BuildMenuOptions {
  autolauncher: AutoLaunch;
  pointerEngine: PointerEngine;
  displayEngine: DisplayEngine;
  configEngine: ConfigEngine;
  rebuildMenu: () => any;
  quit: () => any;
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
  const { tray } = options;
  const menu = new Menu();

  // assignments
  buildAssignmentMenus(options).forEach((m) => {
    menu.append(m);
  });

  // eveything else
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(await buildStartupMenu(options));
  menu.append(buildDebugMenu(options));
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(
    new MenuItem({
      label: 'Quit',
      click: async () => {
        options.quit();
      }
    })
  );

  tray.setContextMenu(menu);

  return menu;
};

export const buildDebugMenu = (options: BuildMenuOptions) => {
  const { configEngine } = options;
  const menu = new Menu();

  menu.append(
    new MenuItem({
      label: 'File Logging',
      type: 'checkbox',
      checked: !!configEngine.config.logFile,
      click: () => {
        configEngine.update({
          logFile: !configEngine.config.logFile
        });
      }
    })
  );

  return new MenuItem({
    label: 'Debug',
    submenu: menu
  });
};

export const buildAssignmentMenus = (options: BuildMenuOptions) => {
  const { pointerEngine, displayEngine, configEngine, tray } = options;
  return pointerEngine.getDevices().map((device) => {
    const submenu = new Menu();
    displayEngine.displays.forEach((display) => {
      submenu.append(
        new MenuItem({
          label: display.label,
          type: 'radio',
          checked: configEngine.config.devices?.[device.product]?.display === display.label,
          click: () => {
            configEngine.update({
              devices: {
                ...configEngine.config.devices,
                [device.product]: { display: display.label }
              }
            });
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
          configEngine.update({
            devices: {
              ...configEngine.config.devices,
              [device.product]: { display: null }
            }
          });
        }
      })
    );

    return new MenuItem({ label: device.product, submenu: submenu });
  });
};

export const buildStartupMenu = async (options: {
  autolauncher: AutoLaunch;
  rebuildMenu: () => any;
  configEngine: ConfigEngine;
}) => {
  const { autolauncher, rebuildMenu, configEngine } = options;

  const autoLaunchEnabled = await autolauncher.isEnabled();
  const startupMenu = new Menu();
  startupMenu.append(
    new MenuItem({
      label: 'Enabled',
      type: 'checkbox',
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

  return new MenuItem({
    label: 'Launch on startup',
    submenu: startupMenu
  });
};
