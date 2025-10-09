import { Montage } from '../dao/Montage';
import { Playlist } from '../dao/Playlist';
import { myParseFloat, myParseInt } from './Helper';
import { Sequencer } from './Sequencer';
import { LogHelper } from './LogHelper';
import { addMontage, setCurrentPlaylist } from './Globals';
import { WebSocketCommand } from '../dao/WebSocketCommand';
import { ItemPlayer } from './ItemPlayer';

export class CommandsManager {
  execute(cmd: any) {
    LogHelper.log('CommandsManager.execute', 'Received command:', cmd);

    switch (cmd.tag_name) {
      case 'montage':
        this.loadMontage(cmd);
        break;
      case 'playlist':
        this.loadPlaylist(cmd);
        break;
      case 'unload':
        this.unload(cmd);
        break;
      case 'cmd':
        if (cmd.action) {
          this.vlc(cmd);
        } else {
          LogHelper.error('CommandsManager.execute', 'Command without action:', cmd);
        }
        break;
      default:
        LogHelper.error('CommandsManager.execute', 'Unknown command tag:', cmd.tag_name, cmd);
    }
  }

  private loadMontage(m: Montage) {
    LogHelper.log('CommandsManager.loadMontage', 'Loading montage:', m.id || m.name);
    addMontage(m);
  }

  private loadPlaylist(p: Playlist) {
    LogHelper.log('CommandsManager.loadPlaylist', 'Loading playlist:', p.id || p.name);
    setCurrentPlaylist(p);
  }

  private unload(inst: any) {
    LogHelper.log('CommandsManager.unload', 'Unload command received:', inst);
    // NB: nothing is loaded, so there is nothing to unload
    // for(const m of inst.montages) {
    //     // unloadMontage(m.id);
    // }
    // for(const p of inst.playlists) {
    //     // unloadPlaylist(p.id, p.permanent == '1');
    // }
  }

  private vlc(cmd: WebSocketCommand) {
    LogHelper.log('CommandsManager.vlc', `Executing VLC command: ${cmd.action}`, cmd);

    const player = ItemPlayer.ThePlayer;

    // Check and fix any state inconsistencies FIRST
    const wasFixed = (Sequencer as any).checkAndFixState?.();
    if (wasFixed) {
      LogHelper.log('CommandsManager.vlc', 'State inconsistency detected and fixed');
    }

    const currentStatus = Sequencer.getStatus();

    // Log current sequencer state for debugging
    LogHelper.log(
      'CommandsManager.vlc',
      `Current sequencer state - Status: ${currentStatus}, Playing: ${Sequencer.isPlaying()}, Paused: ${Sequencer.isPaused()}, Stopped: ${Sequencer.isStopped()}`
    );

    // CRITICAL DEBUG: Log all available information
    console.log('[COMMAND-DEBUG] Command execution details:', {
      action: cmd.action,
      param: cmd.param,
      sequencerStatus: currentStatus,
      isPlaying: Sequencer.isPlaying(),
      isPaused: Sequencer.isPaused(),
      isStopped: Sequencer.isStopped(),
      hasPlaylist: !!Sequencer.getCurrentPlaylist(),
      playlistId: Sequencer.getCurrentPlaylist()?.id,
      playerExists: !!player,
    });

    console.log('🔍 [COMMAND-DEBUG] Processing command:', cmd.action);
    switch (cmd.action) {
      case 'next':
        console.log('🔍 [COMMAND-DEBUG] NEXT command received, calling Sequencer.goNext()');
        LogHelper.log('CommandsManager.vlc', 'Processing NEXT command');
        Sequencer.goNext();
        break;

      case 'prev':
        console.log('🔍 [COMMAND-DEBUG] PREV command received, calling Sequencer.goPrevious()');
        LogHelper.log('CommandsManager.vlc', 'Processing PREV command');
        Sequencer.goPrevious();
        break;

      case 'play':
        LogHelper.log('CommandsManager.vlc', 'Processing PLAY command');

        if (Sequencer.isPaused()) {
          // If paused, resume playback
          LogHelper.log('CommandsManager.vlc', 'Resuming from paused state');
          this.resumePlayback();
        } else if (Sequencer.isStopped()) {
          // If stopped, start fresh
          LogHelper.log('CommandsManager.vlc', 'Starting fresh playback from stopped state');
          if (cmd.param) {
            let pos = myParseFloat(cmd.param);
            LogHelper.log('CommandsManager.vlc', `Starting at position: ${pos}`);
            Sequencer.play(pos);
          } else {
            LogHelper.log('CommandsManager.vlc', 'Calling Sequencer.play() without position');
            Sequencer.play();
          }
          // CRITICAL DEBUG: Check if play() actually started the sequencer
          setTimeout(() => {
            const newStatus = Sequencer.getStatus();
            const isPlaying = Sequencer.isPlaying();
            LogHelper.log(
              'CommandsManager.vlc',
              `After Sequencer.play() - Status: ${newStatus}, Playing: ${isPlaying}`
            );
            if (!isPlaying) {
              LogHelper.error('CommandsManager.vlc', 'Sequencer.play() did not start playback!');
            }
          }, 100);
        } else if (Sequencer.isPlaying()) {
          // Already playing, could be a seek command
          if (cmd.param) {
            let pos = myParseFloat(cmd.param);
            LogHelper.log('CommandsManager.vlc', `Seeking to position: ${pos} while playing`);
            Sequencer.play(pos); // This will seek to the new position
          } else {
            LogHelper.log(
              'CommandsManager.vlc',
              'PLAY command received but already playing - ignoring'
            );
          }
        } else {
          // Unknown state, try to start
          LogHelper.log('CommandsManager.vlc', 'Unknown state, attempting to start playback');
          Sequencer.play(cmd.param ? myParseFloat(cmd.param) : undefined);
        }
        break;

      case 'pause':
        LogHelper.log('CommandsManager.vlc', 'Processing PAUSE command');

        // Allow undefined playlists to proceed normally
        if (Sequencer.getCurrentPlaylist() === null) {
          LogHelper.error('CommandsManager.vlc', 'PAUSE command but null playlist provided');
          return;
        }

        // After state fix, check again
        if (Sequencer.isPlaying()) {
          LogHelper.log('CommandsManager.vlc', 'Pausing active playback');
          this.pausePlayback();
        } else if (Sequencer.isPaused()) {
          LogHelper.log('CommandsManager.vlc', 'Already paused - treating as resume request');
          this.resumePlayback();
        } else {
          // Even if stopped, try to pause (this might trigger a state fix)
          LogHelper.log(
            'CommandsManager.vlc',
            'Not playing but has playlist - attempting pause anyway'
          );
          this.pausePlayback();
        }
        break;

      case 'stop':
        LogHelper.log('CommandsManager.vlc', 'Processing STOP command');

        // Always stop when user clicks stop button - UI commands should always work
        LogHelper.log('CommandsManager.vlc', 'STOP command received - stopping sequencer');
        Sequencer.stop();
        break;

      case 'volume':
        if (cmd.param) {
          const volume = parseInt(cmd.param);
          if (!isNaN(volume)) {
            LogHelper.log('CommandsManager.vlc', `Setting volume to: ${volume}`);
            Sequencer.setVolume(volume);
          } else {
            LogHelper.error('CommandsManager.vlc', 'Invalid volume parameter:', cmd.param);
          }
        } else {
          LogHelper.error('CommandsManager.vlc', 'Volume command without parameter');
        }
        break;

      case 'montage':
        LogHelper.log('CommandsManager.vlc', 'Processing MONTAGE navigation command');
        if (cmd.param) {
          const montageIndex = parseInt(cmd.param);
          if (!isNaN(montageIndex)) {
            LogHelper.log('CommandsManager.vlc', `Navigating to montage: ${montageIndex}`);
            Sequencer.goMontage(montageIndex);
          } else {
            LogHelper.error('CommandsManager.vlc', 'Invalid montage parameter:', cmd.param);
          }
        } else {
          LogHelper.error('CommandsManager.vlc', 'Montage command without parameter');
        }
        break;

      case 'seek':
        if (cmd.param) {
          const seekTime = myParseFloat(cmd.param);
          LogHelper.log('CommandsManager.vlc', `Seeking to: ${seekTime} seconds`);
          Sequencer.seek(seekTime);
        } else {
          LogHelper.error('CommandsManager.vlc', 'Seek command without parameter');
        }
        break;

      default:
        LogHelper.error('CommandsManager.vlc', 'Unknown VLC command:', cmd.action);
    }
  }

  /**
   * Properly pause playback maintaining current position
   */
  private pausePlayback() {
    try {
      const currentOffset = Sequencer.getCurrentOffset();
      LogHelper.log('CommandsManager.pausePlayback', `Pausing at offset: ${currentOffset}`);

      // Call the sequencer's pause method
      Sequencer.pause();

      LogHelper.log('CommandsManager.pausePlayback', 'Playback paused successfully');
    } catch (error) {
      LogHelper.error('CommandsManager.pausePlayback', 'Error during pause:', error);
    }
  }

  /**
   * Resume playback from paused state
   */
  private resumePlayback() {
    try {
      const currentOffset = Sequencer.getCurrentOffset();
      LogHelper.log('CommandsManager.resumePlayback', `Resuming from offset: ${currentOffset}`);

      // Use the play method to resume - this is the correct approach
      Sequencer.play();
      LogHelper.log('CommandsManager.resumePlayback', 'Playback resumed successfully');
    } catch (error) {
      LogHelper.error('CommandsManager.resumePlayback', 'Error during resume:', error);
    }
  }

  /**
   * Get current playback state for debugging
   */
  public getPlaybackState() {
    return {
      isPlaying: Sequencer.isPlaying(),
      isPaused: Sequencer.isPaused(),
      isStopped: Sequencer.isStopped(),
      currentOffset: Sequencer.getCurrentOffset(),
      currentTimestamp: Sequencer.getCurrentTimestamp(),
      status: Sequencer.getStatus(),
    };
  }
}

export const commandsManager = new CommandsManager();

export const executeCommand = (cmd: WebSocketCommand) => {
  try {
    LogHelper.log('executeCommand', 'Executing command:', cmd);
    commandsManager.execute(cmd);
  } catch (error) {
    LogHelper.error('executeCommand', 'Error executing command:', error, cmd);
  }
};

// Export helper function for debugging
export const getPlaybackState = () => {
  return commandsManager.getPlaybackState();
};

// Add this at the bottom of your CommandsManager.ts file:

// Expose command debugging to window
declare global {
  interface Window {
    debugCommands: {
      executePlay: () => void;
      executePause: () => void;
      executeStop: () => void;
      getPlaybackState: () => any;
      testCommand: (action: string, param?: string) => void;
    };
  }
}

if (process.env.NODE_ENV !== 'production') {
  window.debugCommands = {
    executePlay: () => {
      console.log('Debug: Executing PLAY command');
      executeCommand({
        tag_name: 'cmd',
        action: 'play',
      } as WebSocketCommand);
    },

    executePause: () => {
      console.log('Debug: Executing PAUSE command');
      executeCommand({
        tag_name: 'cmd',
        action: 'pause',
      } as WebSocketCommand);
    },

    executeStop: () => {
      console.log('Debug: Executing STOP command');
      executeCommand({
        tag_name: 'cmd',
        action: 'stop',
      } as WebSocketCommand);
    },

    getPlaybackState: () => {
      return commandsManager.getPlaybackState();
    },

    testCommand: (action: string, param?: string) => {
      console.log(`Debug: Testing command ${action}`, param);
      executeCommand({
        tag_name: 'cmd',
        action: action,
        param: param,
      } as WebSocketCommand);
    },
  };

  console.log('Command debug functions added to window.debugCommands');
}
