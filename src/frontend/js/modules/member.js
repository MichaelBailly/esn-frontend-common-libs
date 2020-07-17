const _ = require('lodash');

require('../constants.js');

(function(angular) {
  'use strict';

  angular.module('esn.member', [
    'esn.session',
    'esn.domain',
    'esn.search',
    'esn.infinite-list',
    'openpaas-logo',
    'esn.provider',
    'esn.header',
    'esn.configuration',
    'esn.registry'
  ])
  .constant('memberSearchConfiguration', {
    searchLimit: 20
  })
  .directive('memberDisplay', function() {
    return {
      restrict: 'E',
      scope: {
        member: '=member',
        query: '=?',
        disableProfileLink: '=?'
      },
      template: require("../../views/modules/member/member.pug")
    };
  }).controller('memberscontroller', function($scope, domainAPI, $stateParams, memberSearchConfiguration, usSpinnerService) {

    var domain_id = $stateParams.domain_id;
    $scope.spinnerKey = 'memberSpinner';
    var opts = {
      offset: 0,
      limit: memberSearchConfiguration.searchLimit,
      search: ''
    };

    $scope.search = {
      running: false
    };
    $scope.members = [];
    $scope.restActive = false;
    $scope.error = false;

    var formatResultsCount = function(count) {
      $scope.search.count = count;

      if (count < 1000) {
        $scope.search.formattedCount = count;
      } else {
        var len = Math.ceil(Math.log(count + 1) / Math.LN10);
        var num = Math.round(count * Math.pow(10, -(len - 3))) * Math.pow(10, len - 3);

        $scope.search.formattedCount = num.toString().replace(/(\d)(?=(\d{3})+$)/g, '$1 ');
      }
    };

    var updateMembersList = function() {
      $scope.error = false;
      if ($scope.restActive) {
        return;
      } else {
        $scope.restActive = true;
        $scope.search.running = true;
        formatResultsCount(0);
        usSpinnerService.spin('memberSpinner');

        domainAPI.getMembers(domain_id, opts).then(function(data) {
          formatResultsCount(parseInt(data.headers('X-ESN-Items-Count'), 10));
          $scope.members = $scope.members.concat(data.data);
        }, function() {
          $scope.error = true;
        }).finally(function() {
          $scope.search.running = false;
          $scope.restActive = false;
          usSpinnerService.stop('memberSpinner');
        });
      }
    };

    $scope.init = function() {
      //initializes the view with a list of users of the domain
      updateMembersList();
    };

    $scope.doSearch = function() {
      $scope.members = [];
      opts.offset = 0;
      opts.search = $scope.searchInput;
      updateMembersList();
    };

    $scope.loadMoreElements = function() {
      if ($scope.members.length === 0 || $scope.members.length < $scope.search.count) {
        opts.offset = $scope.members.length;
        updateMembersList();
      }
    };
  })
  .factory('memberSearchProvider', function($q, esnSearchProvider, domainAPI, session, ELEMENTS_PER_REQUEST) {
    var name = 'Members';

    return new esnSearchProvider({
      uid: 'op.members',
      name: name,
      fetch: function(query) {
        var offset = 0;

        return function() {
          return domainAPI.getMembers(session.domain._id, {
            search: query,
            offset: offset,
            limit: ELEMENTS_PER_REQUEST
          }).then(function(members) {
            offset += members.data.length;

            return members.data.map(function(member) {
              member.type = name;
              member.date = new Date();

              return member;
            });
          });
        };
      },
      buildFetchContext: function(options) {
        return $q.when(options.query && options.query.text);
      },
      template: require("../../views/modules/member/member-search-item.pug")
    });
  })

  .factory('MemberPaginationProvider', function(session, domainAPI, memberSearchConfiguration) {

    function MemberPaginationProvider(options) {
      this.options = angular.extend({limit: memberSearchConfiguration.searchLimit, offset: 0}, options);
    }

    MemberPaginationProvider.prototype.loadNextItems = function() {
      var self = this;
      return domainAPI.getMembers(session.domain._id, self.options).then(function(response) {
        var result = {
          data: response.data,
          lastPage: (response.data.length < self.options.limit)
        };

        if (!result.lastPage) {
          self.options.offset += self.options.limit;
        }

        return result;
      });
    };
    return MemberPaginationProvider;
  })

  .factory('MemberScrollBuilder', function(infiniteScrollHelperBuilder, PageAggregatorService, MemberPaginationProvider, ELEMENTS_PER_PAGE) {

    function build($scope, updateScope, options) {

      var aggregator;

      function loadNextItems() {
        aggregator = aggregator || new PageAggregatorService('members', [new MemberPaginationProvider(options)], {results_per_page: ELEMENTS_PER_PAGE});
        return aggregator.loadNextItems().then(_.property('data'), _.constant([]));
      }

      return infiniteScrollHelperBuilder($scope, loadNextItems, updateScope);
    }

    return {
      build: build
    };
  });

})(angular);

require('./config/config.module.js');
require('./header/header.js');
require('./infinite-list/infinite-list.module.js');
require('./search/search.module.js');
require('./domain.js');
require('./provider.js');
require('./session.js');
require('./registry');
require('./member/member-resolver-registry.service.js');
