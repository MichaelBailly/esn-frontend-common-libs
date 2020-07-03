'use strict';

angular.module('esn.activitystream')
.directive('activityStreamUpdatesNotifier', function() {
  return {
    restrict: 'E',
    replace: true,
    template: require("../../../views/modules/activitystream/updates-notifier.pug")
  };
})
.directive('activityStreamNotification', function(moment, session, livenotification, notificationFactory) {
  return {
    restrict: 'A',
    link: function(scope) {
      function liveNotificationHandler(msg) {
        if (msg.actor && msg.actor._id !== session.user._id) {
          var m = moment(new Date(msg.published).getTime());
          notificationFactory.weakInfo('Activity Stream updated',
              msg.actor.displayName + ' added a message ' + m.fromNow());
          scope.asMessagesUpdates = scope.asMessagesUpdates || {post: [], update: []};
          if (msg.verb === 'post') {
            scope.asMessagesUpdates.post.push(msg);
          } else if (msg.verb === 'update') {
            var alreadyKnown = scope.asMessagesUpdates.update
            .concat(scope.asMessagesUpdates.post)
            .some(function(m) {
              return m.object._id === msg.object._id;
            });
            if (!alreadyKnown) {
              scope.asMessagesUpdates.update.push(msg);
            }
          }
        }
      }

      var socketIORoom = livenotification('/activitystreams', scope.activitystream.activity_stream.uuid)
        .on('notification', liveNotificationHandler);

      scope.$on('$destroy', function() {
        socketIORoom.removeListener('notification', liveNotificationHandler);
      });
    }
  };
})
.directive('activityStream', function(_, messageAPI, $rootScope, $timeout) {
    return {
      restrict: 'E',
      scope: {
        // TODO Remove this when the injection module has
        // the method to inject inside all domains.
        calendarHomeId: '=calendarId',
        streams: '=',
        activitystream: '='
      },
      replace: true,
      template: require("../../../views/modules/activitystream/activitystream.pug"),
      controller: 'activitystreamController',
      link: function(scope) {
        scope.streams = scope.streams || [];
        scope.streams = scope.streams.concat(scope.activitystream);

        scope.lastPost = {
          messageId: null,
          comment: null
        };

        function isInStreams(id) {
          return scope.streams.some(function(stream) {
            return stream.activity_stream && stream.activity_stream.uuid === id;
          });
        }

        function onMessagePosted(evt, msgMeta) {
          if (!isInStreams(msgMeta.activitystreamUuid)) {
            return;
          }
          if (scope.restActive[msgMeta.activitystreamUuid] || scope.updateMessagesActive) {
            return;
          }
          scope.getStreamUpdates(msgMeta.activitystreamUuid);
          scope.lastPost.messageId = msgMeta.id;
        }

        function getThreadById(id) {
          var thread = null;
          scope.threads.every(function(msg) {
            if (msg._id === id) {
              thread = msg;
              return false;
            }
            return true;
          });
          return thread;
        }

        function updateMessage(message) {
          var running = message.shares.filter(function(share) {
              return share.objectType === 'activitystream' && scope.restActive[share.id];
            });

          if (running.length > 0 || scope.updateMessagesActive) {
            return;
          }

          message.shares.forEach(function(share) {
            if (share.objectType === 'activitystream' && scope.streams.indexOf(share.id) !== -1) {
              scope.restActive[share.id] = true;
            }
          });

          var parentId = message._id;
          messageAPI.get(parentId).then(function(response) {
            var message = response.data;
            var thread = getThreadById(parentId);
            if (thread) {
              thread.responses = message.responses;
            }
          }).finally(function() {
            message.shares.forEach(function(share) {
              if (share.objectType === 'activitystream' && scope.streams.indexOf(share.id) !== -1) {
                scope.restActive[share.id] = false;
              }
            });
          });
        }

        function onCommentPosted(evt, msgMeta) {
          var thread = getThreadById(msgMeta.parent._id);
          if (thread) {
            updateMessage(thread);
            scope.lastPost.comment = {
              id: msgMeta.id,
              parentId: msgMeta.parent._id
            };
          }
        }

        function onCommentDeleted(evt, data) {
          if (!isInStreams(data.activitystreamUuid)) {
            return;
          }

          var messageId = data.id;
          var parentId = data.parentId;
          var thread = getThreadById(parentId);

          if (!thread) {
            return;
          }

          _.remove(thread.responses, function(item) {
            return item._id === messageId;
          });
        }

        function onMessageDeleted(evt, data) {
          var streamId = data.activitystreamUuid;
          var messageId = data.id;

          if (isInStreams(streamId)) {
            _.remove(scope.threads, function(item) {
              return item._id === messageId;
            });
          }
        }

        // set as read once displayed
        $timeout(function() {
          scope.streams.forEach(function(stream) {
            $rootScope.$emit('activitystream:updated', {
              activitystreamUuid: stream.activity_stream.uuid
            });
          });
        }, 0);

        var unregMsgPostedListener = $rootScope.$on('message:posted', onMessagePosted);
        var unregCmtPostedListener = $rootScope.$on('message:comment', onCommentPosted);
        var unregCmtDeletedListener = $rootScope.$on('message:comment:deleted', onCommentDeleted);
        var unregMsgDeletedListener = $rootScope.$on('message:deleted', onMessageDeleted);

        scope.$on('$destroy', function() {
          unregMsgPostedListener();
          unregCmtPostedListener();
          unregCmtDeletedListener();
          unregMsgDeletedListener();
        });
      }
    };
  })
.directive('activityStreamOrigin', function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      streams: '='
    },
    template: require("../../../views/modules/activitystream/activitystream-origin.pug")
  };
})
.directive('activityStreamCard', function() {
  return {
    scope: {
      activitystream: '='
    },
    restrict: 'E',
    replace: true,
    template: require("../../../views/modules/activitystream/activitystream-card.pug")
  };
})
.directive('activityStreamFilter', function($log, localStorageService) {
  return {
    restrict: 'E',
    template: require("../../../views/modules/activitystream/activitystream-filter.pug"),
    link: function($scope) {

      var storage = localStorageService.getOrCreateInstance('streamFilters');

      $scope.displayList = $scope.streams.filter(function(stream) {
        return stream.activity_stream.uuid !== $scope.activitystream.activity_stream.uuid;
      });

      function getKeyName() {
        return $scope.activitystream._id;
      }

      function getCachedStream() {
        return storage.getItem(getKeyName());
      }

      $scope.selectStream = function(stream) {
        $scope.selectedStream = stream;

        storage.setItem(getKeyName(), stream.activity_stream.uuid).then(function() {
          $log.debug('Filter saved in local storage');
        });
      };

      $scope.clearStreamSelection = function() {
        storage.removeItem(getKeyName()).then(function() {
          $log.debug('Filter removed form local storage');
        }).finally(function() {
          $scope.selectedStream = null;
        });
      };

      getCachedStream().then(function(stream) {
        if (stream) {
          var found = $scope.streams.filter(function(item) {
            return item.activity_stream.uuid === stream;
          });
          if (found.length > 0) {
            $scope.selectedStream = found[0];
          }
        }
      });
    }
  };
});
