'use strict';

/* global chai: false */

var expect = chai.expect;

describe('The Maps Angular module', function() {

  beforeEach(angular.mock.module('esn.maps'));

  describe('geoAPI service', function() {

    beforeEach(angular.mock.inject(function(osmAPI, geoAPI, $httpBackend, $geolocation) {
      this.$httpBackend = $httpBackend;
      this.osmAPI = osmAPI;
      this.geoAPI = geoAPI;
      this.$geolocation = $geolocation;
    }));

    describe('The getCurrentPosition function', function() {
      it('should call the $geolocation service', function(done) {
        this.$geolocation.getCurrentPosition = done;
        this.geoAPI.getCurrentPosition();
      });
    });

  });

  describe('osmAPI service', function() {
    describe('The reverse function', function() {

      beforeEach(angular.mock.inject(function(osmAPI, $httpBackend) {
        this.$httpBackend = $httpBackend;
        this.osmAPI = osmAPI;
      }));

      it('should be a function', function() {
        expect(this.osmAPI.reverse).to.be.a.function;
      });

      it('should HTTP GET //nominatim.openstreetmap.org/reverse', function() {
        var lat = '123456789';
        var lon = '987654321';

        this.$httpBackend.expectGET('//nominatim.openstreetmap.org/reverse?addressdetails=1&format=json&lat=' + lat + '&lon=' + lon).respond({});
        this.osmAPI.reverse(lat, lon);
        this.$httpBackend.flush();
      });
    });
  });

  describe('fillPosition directive', function() {

    beforeEach(function() {
      this.geoAPI = {};
      this.geoAPI.getCurrentPosition = function() {
      };
      this.geoAPI.reverse = function() {};
      var self = this;

      angular.mock.module(function($provide) {
        $provide.value('geoAPI', self.geoAPI);
      });

      this.html = '<a href="#" fill-position></a>';
    });

    beforeEach(angular.mock.inject(function(_$compile_, _$rootScope_) {
      this.$compile = _$compile_;
      this.$rootScope = _$rootScope_;
    }));

    describe('fillPosition function', function() {

      it('should call the geoAPI#getCurrentPosition', function(done) {
        this.geoAPI.getCurrentPosition = done;
        this.$rootScope.position = {};
        var element = this.$compile(this.html)(this.$rootScope);
        this.$rootScope.$digest();
        element.scope().fillPosition();
      });

      it('should call geoAPI#reverse result', function(done) {
        this.$rootScope.position = {};
        var element = this.$compile(this.html)(this.$rootScope);

        var result = {coords: {latitude: 1, longitude: 2}};
        this.geoAPI.getCurrentPosition = function() {
          return $q.when(result);
        };
        this.geoAPI.reverse = function(lat, long) {
          expect(lat).to.equal(result.coords.latitude);
          expect(long).to.equal(result.coords.longitude);
          done();
        };

        element.scope().fillPosition();
        this.$rootScope.$digest();
      });

      it('should set the error when the geoAPI#getCurrentPosition fails', function(done) {
        this.$rootScope.position = {};
        var element = this.$compile(this.html)(this.$rootScope);

        this.geoAPI.getCurrentPosition = function() {
          return $q.reject({ error: { code: 1 } });
        };

        element.scope().fillPosition();
        this.$rootScope.$digest();
        expect(this.$rootScope.position.error).to.be.true;
        done();
      });
    });
  });
});
