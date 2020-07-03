'use strict';

var angularInjections = window.angularInjections || [];

angular.module('esnApp', [
  'restangular',
  'ct.ui.router.extras',
  'mgcrea.ngStrap.affix',
  'mgcrea.ngStrap.modal',
  'mgcrea.ngStrap.aside',
  'angularMoment',
  'angular-clockpicker',
  'truncate',
  'openpaas-logo',
  'frapontillo.bootstrap-switch',
  'chart.js',
  'FBAngular',
  'materialAdmin',
  'xeditable',
  'mp.autoFocus',
  'op.dynamicDirective',
  'awesome-angular-swipe',
  'uuid4',
  'luegg.directives',
  'naturalSort',
  'esn.configuration',
  'ngTagsInput'
].concat(angularInjections))

.config(function(routeResolver, $urlRouterProvider, $stateProvider) {

  // don't remove $injector, otherwise $location is not correctly injected...
  $urlRouterProvider.otherwise(function($injector, $location) {
    return $location.search().continue || '/';
  });

  $urlRouterProvider.when('/', function($location, esnRouterHelper) {
    if ($location.search().continue) {
      return $location.search().continue;
    }

    esnRouterHelper.goToHomePage();
  });

  $stateProvider
  .state('home', {
    url: '/'
  })
  .state('/messages/:id/activitystreams/:asuuid', {
    url: '/messages/:id/activitystreams/:asuuid',
    template: require("../../views/esn/partials/message.pug"),
    controller: 'singleMessageDisplayController',
    resolve: {
      message: routeResolver.api('messageAPI'),
      activitystream: function($stateParams, $location, activitystreamAPI, objectTypeResolver) {
        return activitystreamAPI.getResource($stateParams.asuuid).then(function(response) {
          var objectType = response.data.objectType;
          var id = response.data.object._id;

          return objectTypeResolver.resolve(objectType, id).then(function(collaboration) {
            return collaboration.data;
          }, function() {
            $location.path('/');
          });

        }, function() {
          $location.path('/');
        });
      }
    }
  })

  .state('controlcenter.domainMembers', {
    url: '/domains/:domain_id/members',
    template: require("../../views/esn/partials/members.pug"),
    controller: 'memberscontroller'
  })
  .state('controlcenter.changepassword', {
    url: '/changepassword',
    template: require("../../views/modules/login/changepassword.pug"),
    controller: 'changePasswordController'
  })
  .state('controlcenter.timeline', {
    url: '/timeline',
    template: '<esn-timeline-entries></esn-timeline-entries>'
  })
  .state('logout', {
    url: '/logout',
    controller: 'logoutController'
  });

})

.config(function(tagsInputConfigProvider) {
  // Override default placeholder on user-autocomplete-input component
  tagsInputConfigProvider.setActiveInterpolation('tagsInput', {
    placeholder: true,
    displayProperty: true
  });
});
