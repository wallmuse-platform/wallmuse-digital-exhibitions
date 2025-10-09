declare global {
  interface Window {
    onWebPlayerReady?: () => void;
    webPlayerNavigate?: (params: any) => void;
    Sequencer?: any;
  }
}

export {};
