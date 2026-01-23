## Prerequisites

You need node version 16 and npm version 8 to be able to build the project. It has not been tested yet with other versions.

You can install and manage both with [nvm](https://github.com/nvm-sh/nvm):
```shell
nvm use 16
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
file `create-montage.php`. 

This file is imported from the actual WordPress template which is named `create_montages_v2.php`, so it is also 
a good place to put any custom CSS rules required.

Apart from the js and css, the page also needs to have an element to serve as the root point of React:
```html
    <div id="root-create-montage" data-user="<?=$sessionId?>" data-theme="wallmuse"></div>
```

Please note:
* The ID of the element should be as shown above `root-create-montage`, otherwise the React app will not be able to render
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

/data/www/wallmuse-wp/wp-content/themes/neve-child-master/create-montage-v2-assets

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
    <div id="root-create-montage" data-user="<?=$sessionId?>" data-theme="clientX"></div>
    ```

## Documentation

For detailed documentation, see the `/doc` folder:
- [Development Rules](doc/DEVELOPMENT_RULES.md) - Architecture, tools system, and coding standards
- [CreateMontage Rules](doc/CREATE_MONTAGE_RULES.md) - Quick reference for shared components and contexts
- [Add Content](doc/AddContent.md) - Add Content feature documentation
- [Features](doc/FEATURES.md) - Feature overview

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
