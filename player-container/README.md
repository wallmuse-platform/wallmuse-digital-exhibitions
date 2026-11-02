# Explore

## Documentation

Project documentation is organized in the [docs/](./docs/) folder:

### Architecture
- [Enhanced Navigation Solution](./docs/architecture/ENHANCED_NAVIGATION_SOLUTION.md)
- [Navigation System Refactor](./docs/architecture/NAVIGATION_SYSTEM_REFACTOR.md)
- [Player Container Rules](./docs/architecture/PLAYER_CONTAINER_RULES.md)
- [Player Container State Management](./docs/architecture/PLAYER_CONTAINER_STATE_MANAGEMENT.md)
- [WallMuse Player Container Rules](./docs/architecture/WALLMUSE_PLAYER_CONTAINER_RULES.md)

### Features
- [Guest Action Popup](./docs/features/GUEST_ACTION_POPUP_DOCS.md)
- [Mobile Autoplay Solution](./docs/features/MOBILE_AUTOPLAY_SOLUTION.md)
- [Temporary Playlist Lifecycle](./docs/features/TEMPORARY_PLAYLIST_LIFECYCLE.md)
- [WallMuse Features](./docs/features/WALLMUSE_FEATURES.md)
- [WordPress Integration](./docs/features/WORDPRESS_INTEGRATION.md)

### Troubleshooting
- [LocalStorage Duplication Debug](./docs/troubleshooting/LOCALSTORAGE_DUPLICATION_DEBUG.md)
- [Player Container Troubleshooting](./docs/troubleshooting/PLAYER_CONTAINER_TROUBLESHOOTING.md)
- [Play Montage Fix and Mono Playlist Plan](./docs/troubleshooting/PLAY_MONTAGE_FIX_AND_MONO_PLAYLIST_PLAN.md)
- [Troubleshooting Account Creation](./docs/troubleshooting/TROUBLESHOOTING_ACCOUNT_CREATION.md)

## Prerequisites

You need node version 18 and npm version 8 to be able to build the project. It was difficult to revert back to React 16 as v5 MUI icons (using @mui/material version 5.15.2 and @mui/icons-material version 5.14.18), but even when changing there remained an unsolved issue.

You can install and manage both with [nvm](https://github.com/nvm-sh/nvm):
```shell
nvm use 18
```

Finally, with npm installed, you need to download the application's dependencies, with:
```shell
npm install
```

Now you can use one of the available scripts listed below to either build the app, or test it locally.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes. You may also see any lint errors in the console.

To test as a specific user, you need to update the `data-user` property on the line 36 of `public/index.html`. 
This is the sessionId of the WordPress user, which can be obtained by doing a `<?=$sessionId?>` on the PHP code 
of the website.

### `npm test`

Launches the test runner in the interactive watch mode. 
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.
*No tests have been implemented yet.*

### `npm run build`

Builds the app for production to the `build` folder.
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes. The app is ready to be deployed!

Please the "Deploy" section below regarding how to deploy on the WallMuse Server.

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Deploy

After building the app for production, you should place the contents of `build/css/` and `build/js` directories on the 
WordPress template folders. The host and path details are shown below. You can connect over SSH or SFTP.

Having done that, you need to update the WordPress template to actually use the new files. This needs to be done in the
file `descriptions.php`. 

This file is imported from the actual WordPress template which is named `wm_v4_player_static.php`, so it is also 
a good place to put any custom CSS rules required.

Apart from the js and css, the page also needs to have an element to serve as the root point of React:
```html
    <div id="root" data-user="<?=$sessionId?>" data-theme="wallmuse"></div>
```

Please note:
* The ID of the element should be as shown above `root`, otherwise the React app will not be able to render
* `data-user` indicates the current user's session and is used to fetch the relevant artworks, etc. `<?=$sessionId?>` can be used to retrieve it from the PHP code.
* `data-theme` indicates the theme that will be used. The theme is case insensitive, and possible values are shown below:

| Theme    | Description                  |
| -------- | ------------                 |
| Wallmuse | This is the default theme    | 
| Sharex   | Theme for the Sharex account | 
| AVIFF    | Theme for the AVIFF account  | 
| OOO2     | Theme for the OOO2 account   | 


### Host

wallmuse.com

### Path

/data/www/wallmuse-wp/wp-content/themes/neve-child-master/play-v4-assets

## Theming

As described above, theming can be selecting by setting the `data-theme` attribute in the hosting div, as described 
above. The theme will only affect the palette of the colours used throughout the application. At the moment the 
following themes are available:


| Theme    | Description                  |
| -------- | ------------                 |
| Wallmuse | This is the default theme    | 
| Sharex   | Theme for the Sharex account | 
| AVIFF    | Theme for the AVIFF account  | 
| OOO2     | Theme for the OOO2 account   | 


In order to create a new theme, the following should be done:
* Under `src/theme/`, copy one of the existing theme files, e.g. `WallMuseTheme.js` and use an appropriate name for the new file, eg. `ClientXTheme.js`
* Open `ClientXTheme.js` and 
  * edit the `palette` object in it to use the colours you want
  * At the bottom, change the export statement accordingly, e.g.:
  ```js
  export const ClientXTheme = theme(palette);
  ```
* Save `ClientXTheme.js`
* Open `src/theme/ThemeUtils.js`
  * In the `selectTheme` function, add a new `case` in the `switch` statement:
  ```
  case "clientx":
    return ClientXTheme;
  ```
* The new theme can now be used:
  * ```html
    <div id="root-descriptions" data-user="<?=$sessionId?>" data-theme="clientX"></div>
    ```
## Global variables

Apart from those used in PHP, particularily common.php and common0.php, see Word Press Child Neve Master repository, global variables are parsed using:

### EnvironmentsProvider "./contexts/EnvironmentsContext.js";

These concern useStates for:
* const [houses, setHouses] = useState([]); it's the account, multiple houses currently not implemented
* const [house, setHouse] = useState([]); current used account and house
* const [environments, setEnvironments] = useState([]); concerning phyical devices with PC Backend player and virtual streams with Web player
* const [screens, setScreens] = useState([]);

###  UIProvider './Playlists/contexts/UIContext';

Concerns useResponsive() implementation

### SessionProvider './contexts/SessionContext';

Concerns:
* userDetails, the Word Press session of an account (text)
* isLoggedIn
* isPremium 

### PlaylistsProvider './contexts/PlaylistsContext';

Concerns success messages.


## Styling

Styling occurs at different levels, similarily to React's precedence. 

public/index.html
  |
  └── src/index.js
       ├── src/index.css, used to filter out some Neve theme styles as Word Press embedded as PHP page template
       |              see wm_v4_player.php and wm_v4_player_static.php
       |              also Word Press Child Neve Master repository for customised parts of Neve theme
       |
       └── src/App.js
            ├── src/App.css, also used responsiveness
            |
            └── src/components
                 |
                 └── src/components/header/header.jsx e.g. using styled in PlayList.js and PlayListItem.js  
                      |         but also for useResponsive.js that utilises navigator.userAgent for TV detection
                      └── src/components/header/header.css e.g. PlayLists.css, PlayListItem.css

Material UI provides several different ways to customize a component's styles. From broadest to narrowest, here are the options:
* Global CSS override, also using classes such as tabs_icon and tabs_text indicated in App.css
* Global theme overrides, 
* Reusable component, mostly palette of theme.js
* One-off customization, that occur freequently directly in the code



## Learn More

This app was built using create-react-app. You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

