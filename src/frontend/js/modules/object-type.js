(function(angular) {
  'use strict';

  angular.module('esn.object-type', [])

    .run(function(objectTypeResolver, $q) {
      objectTypeResolver.register('string', function(id) {
        var defer = $q.defer();

        defer.resolve(id);

        return defer.promise;
      });
    })
    .factory('objectTypeAdapter', function() {

      var adapters = {};

      function register(objectType, adapter) {
        if (!objectType) {
          throw new Error('ObjectType can not be null');
        }

        if (!adapter) {
          throw new Error('Adapter can not be null');
        }

        if (!angular.isFunction(adapter)) {
          throw new Error('Adapter must be a function');
        }
        adapters[objectType] = adapter;
      }

      function adapt(model) {
        if (!model) {
          throw new Error('Model is required');
        }

        if (!model.objectType) {
          return model;
        }

        var adapter = adapters[model.objectType];

        if (!adapter) {
          return model;
        }

        return adapter(model);
      }

      return {
        register: register,
        adapt: adapt
      };
    })
    .factory('objectTypeResolver', function($q) {

      var resolvers = {};

      function register(objectType, resolver) {
        if (!objectType) {
          throw new Error('ObjectType can not be null');
        }

        if (!resolver) {
          throw new Error('Resolver can not be null');
        }

        if (!angular.isFunction(resolver)) {
          throw new Error('Resolver must be a function');
        }

        resolvers[objectType] = resolver;
      }

      function resolve(/* objectType[, subids...[, id]] */) {
        var args = Array.prototype.slice.call(arguments);
        var id = args[args.length - 1];
        var objectType = args.shift();

        if (!objectType) {
          return $q.reject(new Error(objectType + ' is not a valid resolver name'));
        }

        if (!id) {
          return $q.reject(new Error('Resource id is required'));
        }

        var resolver = resolvers[objectType];

        if (!resolver) {
          return $q.reject(new Error(objectType + ' is not a registered resolver'));
        }

        return resolver.apply(this, args);
      }

      return {
        register: register,
        resolve: resolve
      };
    });

})(angular);
