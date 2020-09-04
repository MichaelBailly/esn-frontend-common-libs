(function() {
  'use strict';

  angular.module('esn.collaboration')
    .directive('esnCollaborationInvitationDeclineButton', esnCollaborationInvitationDeclineButton);

  function esnCollaborationInvitationDeclineButton(
    esnCollaborationClientService,
    session
  ) {
    return {
      link: link,
      restrict: 'E',
      require: '^esnCollaborationMembershipInvitationUserNotification',
      template: require('./collaboration-invitation-decline-button.pug')
    };

    function link(scope, element, attrs, invitationController) {
      scope.restActive = false;
      scope.decline = function() {
        scope.restActive = true;
        esnCollaborationClientService.cancelRequestMembership(scope.invitationCollaboration.objectType, scope.invitationCollaboration._id, session.user._id).then(
          function() {
            scope.notification.setAcknowledged(true).then(
              function() {
                invitationController.actionDone('decline');
              },
              function(error) {
                scope.error = error;
              }
            ).finally(function() {
              scope.restActive = false;
            });
          },
          function(error) {
            scope.error = error;
            scope.restActive = false;
          }
        );
      };
    }
  }
})();
