function calculateDuration(totalDur) {
    const hours = Math.floor(totalDur / 3600);
    const minutes = Math.floor((totalDur % 3600) / 60);
    const seconds = Math.round(totalDur % 60);
  
    return `${formatN(hours)}:${formatN(minutes)}:${formatN(seconds)}`;
}
  
function formatN(n) {
    return n.toString().padStart(2, '0');
}

export default calculateDuration;