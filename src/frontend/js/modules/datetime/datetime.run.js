require('./datetime.service.js');

(function(angular) {
  'use strict';

  angular.module('esn.datetime')
    .run(run);

  function run(moment, esnDatetimeService) {
    esnDatetimeService.init().then(function() {
      moment.tz.setDefault(esnDatetimeService.getTimeZone());
    });
  }
})(angular);
