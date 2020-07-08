(function(angular) {
  'use strict';

  angular.module('esn.company', ['esn.http'])

  .factory('companyAPI', function(esnRestangular) {
    function search(searchQuery) {
      return esnRestangular.all('companies').getList(searchQuery);
    }

    return {
      search: search
    };
  })

  .directive('ensureUniqueCompany', function(companyAPI) {
    return {
      restrict: 'A',
      scope: true,
      require: 'ngModel',
      link: function(scope, elem, attrs, control) {
        var lastValue = null;
        control.$viewChangeListeners.push(function() {
          var companyName = control.$viewValue;
          if (companyName === lastValue) {
            return;
          }

          lastValue = companyName;

          if (!companyName.length) {
            return;
          }

          control.$setValidity('ajax', false);
          (function(searchField) {
            companyAPI.search({name: searchField}).then(
              function() {
                if (lastValue !== searchField) {
                  return;
                }
                control.$setValidity('ajax', true);
                control.$setValidity('unique', false);
              },
              function() {
                if (lastValue !== searchField) {
                  return;
                }
                control.$setValidity('ajax', true);
                control.$setValidity('unique', true);
              }
            );
          })(lastValue);
        });
      }
    };
  });
})(angular);

require('./http.js');
