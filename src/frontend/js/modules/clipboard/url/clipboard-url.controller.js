(function(angular) {
  'use strict';

  angular.module('esn.clipboard')
    .controller('esnClipboardUrlController', esnClipboardUrlController);

  function esnClipboardUrlController($log, notificationFactory) {
    var self = this;

    self.onCopySuccess = onCopySuccess;
    self.onCopyFailure = onCopyFailure;
    self.onTextClick = onTextClick;

    function onTextClick($event) {
      $event.target.select();
    }

    function onCopySuccess() {
      notificationFactory.weakInfo('', 'Link copied to clipboard');
    }

    function onCopyFailure(err) {
      $log.error('Can not copy link to clipboard', err);
    }
  }
})(angular);
