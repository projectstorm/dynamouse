import { app, nativeImage, Tray } from 'electron';
import * as path from 'path';
import { DisplayEngine } from './DisplayEngine';
import { PointerDevice, PointerEngine } from './PointerEngine';
import { ConfigEngine } from './ConfigEngine';
import { RobotEngine } from './RobotEngine';
import AutoLaunch from 'auto-launch';
import { createLogger, transports } from 'winston';
import { buildLoadingMenu, buildMenu } from './menu';
import { waitForAllPermissions } from './permissions';

require('source-map-support').install();

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

app.on('ready', async () => {
  const tray = new Tray(
    icon_mac.resize({
      width: 16,
      height: 16
    })
  );
  buildLoadingMenu({ tray });

  // need to get some permissions before we can continue
  await waitForAllPermissions();

  // can hide the dock at this point as permissions checks might need to icon so users can switch to the dialog
  app.dock.hide();

  const setupMovement = () => {
    return robotEngine.setupAssignments(configEngine.config);
  };

  const buildMenuWrapped = () => {
    buildMenu({
      tray,
      assignDisplayToDevice,
      displayEngine,
      pointerEngine,
      configEngine,
      autolauncher
    });
  };

  const assignDisplayToDevice = (display_id: string, device: PointerDevice) => {
    configEngine.update({
      devices: {
        ...configEngine.config.devices,
        [device.product]: { display: display_id }
      }
    });
    buildMenuWrapped();
    setupMovement();
  };

  pointerEngine.registerListener({
    devicesChanged: () => {
      buildMenuWrapped();
      setupMovement();
    }
  });

  // add a startup delay
  const delay = (configEngine.config.startupDelay || 0) * 1_000;

  if (delay > 0) {
    buildLoadingMenu({ tray, message: `...waiting ${delay}ms (startup delay)` });
  }

  // might want startup delay
  setTimeout(() => {
    configEngine.init();
    pointerEngine.init();
    displayEngine.init();

    buildMenuWrapped();
    setupMovement();
  }, delay);
});
