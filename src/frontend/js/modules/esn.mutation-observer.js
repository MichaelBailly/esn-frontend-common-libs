(function(angular) {
  'use strict';

  angular.module('esn.mutation-observer', [])

  .constant('MutationObserver', window.MutationObserver);
})(angular);
