(function() {
  'use strict';

  angular.module('esn.collaboration')
    .directive('esnCollaborationMembershipInvitationUserNotification', esnCollaborationMembershipInvitationUserNotification);

  function esnCollaborationMembershipInvitationUserNotification(
    $q,
    objectTypeResolver,
    session
  ) {
    return {
      controller: controller,
      restrict: 'E',
      replace: true,
      scope: {
        notification: '='
      },
      template: require("./collaboration-membership-invitation.pug")
    };

    function controller($scope) {
      var userResolver = objectTypeResolver.resolve($scope.notification.subject.objectType, $scope.notification.subject.id);
      var collaborationResolver = objectTypeResolver.resolve($scope.notification.complement.objectType, $scope.notification.complement.id);

      this.actionDone = function(action) {
        $scope.notification.actionDone = action;
      };

      $scope.invitedUser = session.user;
      $scope.error = false;

      $q.all({user: userResolver, collaboration: collaborationResolver}).then(function(result) {
        $scope.invitationSender = result.user.data;
        $scope.invitationSenderDisplayName = $scope.invitationSender.displayName($scope.invitationSender);
        $scope.invitationCollaboration = result.collaboration.data || result.collaboration;
        $scope.invitationCollaboration.objectType = $scope.notification.complement.objectType;
        $scope.collaborationPath = getCollaborationPath($scope.notification.complement.objectType);
      }, function(err) {
        if (err.status && err.status === 404) {
          return notFound();
        }

        $scope.error = true;
      }).finally(function() {
        $scope.loading = false;
      });

      function notFound() {
        $scope.notFound = true;
        $scope.notification.setAcknowledged(true);
      }

      // This needs to be refactored to support objectTypeAdapters
      // For now we hardcode it
      function getCollaborationPath(objectType) {
        return {
          community: 'community/view',
          'chat.conversation': 'chat/channels/view'
        }[objectType] || 'community';
      }
    }
  }
})();
