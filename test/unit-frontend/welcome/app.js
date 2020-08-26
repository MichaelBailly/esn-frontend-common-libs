'use strict';

/* global chai: false */

var expect = chai.expect;

describe('The welcome app', function() {
  beforeEach(angular.mock.module('welcomeApp'));

  var location, route, rootScope, httpBackend;

  beforeEach(inject(function($location, $route, $rootScope, $httpBackend) {
    location = $location;
    route = $route;
    rootScope = $rootScope;
    httpBackend = $httpBackend;
  }));

  describe('route provider', function() {

    it('should load the home page when routing to /login', function() {
      httpBackend.expectGET('/views/welcome/partials/home').respond(200);
      location.path('/login');
      rootScope.$digest();
      expect(route.current.originalPath).to.equal('/login');
      expect(route.current.params).to.deep.equal({});
    });

    it('should load the home page when routing to /', function() {
      httpBackend.expectGET('/views/welcome/partials/home').respond(200);
      location.path('/');
      rootScope.$digest();
      expect(route.current.originalPath).to.equal('/');
      expect(route.current.params).to.deep.equal({});
    });

    it('should load the home page when routing to an unknown path and set the continue parameter', function() {
      httpBackend.expectGET('/views/welcome/partials/home').respond(200);
      var continuePath = '/pathForContinue';
      location.path(continuePath);
      rootScope.$digest();
      expect(route.current.originalPath).to.equal('/');
      expect(route.current.params).to.deep.equal({continue: continuePath});
    });
  });
});
