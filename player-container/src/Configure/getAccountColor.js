export function getAccountColor(accountType) {
  switch(accountType) {
    case 'ADM':
    case 'Admin':
      return '#6362D9';
    case 'CLI':
    case 'Account':
    case 'SUB':
    case 'Sub-Account':
      return '#62D9B9';
    case 'CUR':
    case 'Curator':
    case 'MUS':
    case 'Museum':
      return '#62ABD9';
    case 'PAR':
    case 'Partner':
      return '#E04CDD';
    case 'PAY':
    case 'Premium':
      return '#1556ED';
    case 'FREE':
    case 'Free':
      return '#0EE6AC';
    default:
      return '#000000'; // Default color if account type is not recognized
  }
}