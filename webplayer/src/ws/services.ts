import { WsTools } from './ws-tools';
import { Playlist } from '../dao/Playlist';
import { User } from '../dao/User';

export class Webservices {
  constructor(private wstools: WsTools) {}

  public getPlaylists(): Promise<Playlist[] | undefined> {
    return this.wstools
      .get<PlaylistsList>('get_playlists?user=' + this.wstools.getUser().id + '&version=1')
      .then(r => r.playlists?.map(p => new Playlist(p)));
  }

  public getJoomlaUser() {
    return this.wstools.get<User>('get_joomla_user');
  }

  // public getCommands() {
  //     this.wstools.get<string>('get_commands?environ=' + X + '&key=' + Y + '&version=1')
  //         .then(r => r.playlists?.map(p => new Playlist(p)));
  // }
}

class PlaylistsList {
  playlists?: Playlist[];
}
