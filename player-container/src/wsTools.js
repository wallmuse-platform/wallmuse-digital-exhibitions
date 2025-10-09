// wsTools.js refactored so independent to rootElement, for variable sessions and houses
import { rootElement } from './utils/Utils';

const RootUrl = 'https://manager.wallmuse.com:8444/wallmuse/ws/';
const session = rootElement.dataset.user;

export const sendCommand = (house, command, complete = () => { }) => {
    console.log('[wsTools] DEBUG: Starting sendCommand', { 
        session, 
        house, 
        houseType: typeof house,
        command,
        url: RootUrl + 'send_command?version=2&session=' + session + '&house=' + house + '&command=' + encodeURIComponent(command)
    });
    
    if (!session) {
        console.error('[wsTools] ERROR: Session is null or undefined');
        complete(false, 'Session is null or undefined');
        return;
    }
    
    if (!house) {
        console.error('[wsTools] ERROR: House is null or undefined');
        complete(false, 'House is null or undefined');
        return;
    }
    
    console.log('[wsTools] Sending command to session:' + session + ', house:' + house + ', command:' + command);
    fetch(RootUrl + 'send_command?'
        + 'version=2'
        + '&session=' + session
        + '&house=' + house
        + '&command=' + encodeURIComponent(command)
    ).then(result => {
        console.log('[wsTools] DEBUG: Fetch response received', { status: result.status, ok: result.ok });
        result.text().then(text => {
            if (text.trim().startsWith('<error')) {
                console.log('[wsTools] Result KO: ' + text);
                complete(false, text); // Pass the error text as the second argument
            } else {
                console.log('[wsTools] Result OK: ' + text);
                complete(true, text); // Pass the actual response as the second argument
            }
        });
    }).catch(reason => {
        console.error('[wsTools] Error: ', reason);
        complete(false, reason); // Pass the error reason as the second argument
    });
};