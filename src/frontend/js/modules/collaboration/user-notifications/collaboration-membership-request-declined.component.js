// was collaborationMembershipRequestDeclinedNotification
(function() {
  'use strict';

  angular.module('esn.collaboration')
    .component('esnCollaborationMembershipRequestDeclinedUserNotification', esnCollaborationMembershipRequestDeclinedUserNotification());

  function esnCollaborationMembershipRequestDeclinedUserNotification() {
    return {
      bindings: {
        notification: '='
      },
      controller: 'CollaborationRequestMembershipActionUserNotificationController',
      controllerAs: 'ctrl',
      template: require('./collaboration-membership-request-declined.pug')
    };
  }
})();
