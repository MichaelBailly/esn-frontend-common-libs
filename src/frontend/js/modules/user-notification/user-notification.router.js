(function() {
  'use strict';

  angular.module('esn.user-notification')
    .config(configBlock);

  function configBlock($stateProvider) {
    $stateProvider
      .state('user-notification', {
        url: '/user-notification',
        template: require('./user-notification.pug'),
        deepStateRedirect: {
          default: 'user-notification.list',
          fn: function() {
            return { state: 'user-notification.list' };
          }
        }
      })
      .state('user-notification.list', {
        url: '/list',
        views: {
          'main@user-notification': {
            template: '<sub-header><esn-user-notification-subheader/></sub-header><esn-user-notification-list/>'
          }
        }
      });
  }
})();
