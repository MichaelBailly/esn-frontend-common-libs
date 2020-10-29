angular.module('esn.authentication', ['esn.http'])
  .factory('tokenAPI', function(esnRestangular) {

    // https://github.com/linagora/openpaas-esn/blob/master/backend/core/auth/token.js#L3
    // token TTL is 60 seconds server-side. We keep a lower value to get over
    // network lags
    const CACHE_MAX_TTL = 45 * 1000;

    let cachedToken = { promise: null, timestamp: 0 };

    return {
      getNewToken
    };

    function getCachedToken() {
      const { promise, timestamp } = cachedToken;

      return timestamp + CACHE_MAX_TTL > Date.now() ? promise : getTokenNoCache();
    }

    function getTokenNoCache() {
      const promise = esnRestangular.one('authenticationtoken').get();
      const timestamp = Date.now();

      promise.then(() => {
        cachedToken = { promise, timestamp };
      });

      return promise;
    }

    function getNewToken(resetCache = false) {
      return resetCache ? getTokenNoCache() : getCachedToken();
    }
  });

require('./http.js');
