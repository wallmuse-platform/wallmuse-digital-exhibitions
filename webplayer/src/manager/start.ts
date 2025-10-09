import { WsTools } from '../ws/ws-tools';
import { Webservices } from '../ws/services';
import { ScreenManager } from './HardwareChecker';
import { LogHelper } from './LogHelper';
import { Sequencer } from './Sequencer';

export const wsTools = WsTools.getInstance();
export const services = new Webservices(wsTools);

// Make wsTools available globally for debugging
declare global {
  interface Window {
    wsTools: typeof wsTools;
  }
}
window.wsTools = wsTools;

export const setHouse = (houseId: number, environId: number, screenId: number, key: string) => {
  wsTools.setHouse(houseId, environId, screenId, key);
};

export const startAuthenticated = (token: string) => {
  wsTools.assumeToken(token).then(b => LogHelper.log('start.startAuthenticated', b));
  finishStart();
};

export const start = (login: string, pwd: string, token: string) => {
  wsTools.checkAuthentication(login, pwd).then(b => {
    if (b) {
      LogHelper.log('start.start', 'OK');
    } else {
      wsTools.assumeToken(token).then(b => LogHelper.log('start.start2', b));
    }
  });
  finishStart();
};

const finishStart = () => {
  ScreenManager.check();
  Sequencer.init(() => {
    // This is the callback, it can be empty
  });
};
