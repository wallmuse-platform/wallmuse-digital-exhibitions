import { v4 as uuidv4 } from 'uuid';

export const getBrowserId = () => {
    let browserId = localStorage.getItem('browserId');
    if (!browserId) {
        browserId = uuidv4();
        localStorage.setItem('browserId', browserId);
        console.log('[Browser Identifier] Generated new browserId:', browserId);
    } else {
        console.log('[Browser Identifier] Existing browserId:', browserId);
    }
    return browserId;
};