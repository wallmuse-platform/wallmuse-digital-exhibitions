import { LogHelper } from './LogHelper';

export class ScreenManager {
  public static check = async () => {
    LogHelper.log('ScreenManager.check', 'Screens?');
    let granted = false;
    if ('getScreenDetails' in window) {
      try {
        // @ts-ignore
        // const cr = await navigator.permissions.query({name: 'window-management'});
        // granted = (cr.state === 'granted');
        // @ts-ignore
        LogHelper.log('ScreenManager.check', 'Screens', await window.getScreenDetails());
      } catch (e) {
        LogHelper.log('ScreenManager.check', '-> No right for screens', e);
      }
    } else {
      LogHelper.log('ScreenManager.check', '-> No advanced screen management');
    }
  };
}
