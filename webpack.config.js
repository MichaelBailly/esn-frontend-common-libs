const path = require('path');
const { accessSync } = require('fs');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const angularInjections = path.resolve(__dirname, 'src', 'require-angular-injections.js');
const momentPath = path.resolve(__dirname, 'node_modules', 'moment', 'moment.js');
const commonLibsPath = path.resolve(__dirname);
const angularCommon = path.resolve(__dirname, 'src', 'angular-common');
const chartJs = path.resolve(__dirname, 'src', 'frontend', 'components', 'Chart.js/Chart.js');
const materialAdmin = path.resolve(__dirname, 'src', 'frontend', 'js', 'material.js');
const pugLoaderOptions = {};

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  devtool: "source-map",
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    alias: {
      'moment/moment.js': momentPath,
      'moment$': momentPath
    },
  },
  plugins: [
    new webpack.IgnorePlugin({ resourceRegExp: /codemirror/ }), // for summernote
    new webpack.ProvidePlugin({
      jQuery: 'jquery',
      $: 'jquery',
      'window.jQuery': 'jquery',
      'window.$': 'jquery',
      'Chart': chartJs,
      materialAdmin: materialAdmin,
      angular: angularCommon,
      'window.angularInjections': angularInjections,
      localforage: 'localforage', // for calendar
    }),
    /*
     * To transform assets/index.pug to an HTML file, with webpack autoimporting the "main.js" bundle
     */
    new HtmlWebpackPlugin({
      template: './assets/index.pug',
      filename: './index.html'
    }),
  ],
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9900,
    proxy: [{
      context: [
        '/auth',
        '/api',
        '/views',
        '/account/api',
        '/profile/app',
        '/controlcenter/app',
        '/images',
        '/socket.io/',
        '/user-status/app/bubble/',
        '/user-status/api',
        '/contact/app',
        '/contact/images',
        '/dav/api',
        '/unifiedinbox/views',
        '/unifiedinbox/app',
        '/unifiedinbox/api',
        '/calendar/app',
        '/linagora.esn.resource/api'
      ],
      target: 'http://localhost:8080',
/*      target: 'https://dev.open-paas.org',
      disableHostCheck: true,
      secure: false,
      changeOrigin: true,
*/
    }]
  },
  module: {
    rules: [
      /*
      for esn-frontend-common-libs

      can be removed after using a require for emailAddresses instead of a global $window.emailAddresses

        angular.module('esn.email-addresses-wrapper', [])

        .factory('emailAddresses', function($window) {
          return $window.emailAddresses;
        });

      */
      {
        test: require.resolve('email-addresses'),
        loader: 'expose-loader',
        options: {
          exposes: 'emailAddresses',
        },
      },
      /*
      for esn-frontend-common-libs

      can be removed after using a require for autosize instead of a global $window.autosize

      angular.module('esn.form.helper')
        .factory('autosize', function($window) {
            return $window.autosize;
          })

      */
      {
        test: require.resolve('autosize'),
        loader: 'expose-loader',
        options: {
          exposes: 'autosize',
        },
      },
      /*
      for esn-frontend-common-libs

      can be removed after using a require for Autolinker instead of a global $window.Autolinker

      angular.module('esn.autolinker-wrapper', [])

        .factory('autolinker', function($window) {
          return $window.Autolinker;
        });

      */
      {
        test: require.resolve(commonLibsPath + '/src/frontend/components/Autolinker.js/dist/Autolinker.js'),
        loader: 'expose-loader',
        options: {
          exposes: 'Autolinker',
        },
      },
      /*
      for angular-jstz in esn-frontend-common-libs
      */
      {
        test: require.resolve(commonLibsPath + '/src/frontend/components/jstzdetect/jstz.js'),
        loader: 'expose-loader',
        options: {
          exposes: [
            "jstz"
          ],
        },
      },
      /*
        usefull, at least for esn-frontend-common-libs / notification.js:

        var notification = $window.$.notify(escapeHtmlFlatObject(options), angular.extend({}, getDefaultSettings(options), settings));

      */
      {
        test: require.resolve('jquery'),
        loader: 'expose-loader',
        options: {
          exposes: '$',
        },
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      },
      {
        test: /all\.less$/,
        use: [
          {
            loader: 'style-loader', // creates style nodes from JS strings
          },
          {
            loader: 'css-loader', // translates CSS into CommonJS
          },
          {
            loader: 'less-loader', // compiles Less to CSS
            options: {
              lessOptions: {
                javascriptEnabled: true
              }
            }
          }
        ]
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'url-loader',
          },
        ],
      },
      {
        test: /\.svg$/,
        loader: 'svg-inline-loader'
      },
      /*
      * for the "index.html" file of this SPA.
      *
      */
      {
        test: /assets\/index\.pug$/,
        use: [
          {
            loader: 'pug-loader',
          },
        ],
      },
      {
        test: /\.pug$/i,
        exclude: /assets\/index\.pug$/,
        use: [
          {
            loader: 'apply-loader',
          },
          {
            loader: 'pug-loader',
            options: pugLoaderOptions
          },
        ],
      },
    ],
  },
}
