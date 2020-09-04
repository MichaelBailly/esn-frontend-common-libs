'use strict';

/* global chai */

var { expect } = chai;

describe('The touchscreenDetector service', function() {
  var $window, touchscreenDetectorService;

  beforeEach(angular.mock.module(function($provide) {
    $provide.value('$window', $window = {
      navigator: {}
    });
  }));

  beforeEach(angular.mock.module('esn.touchscreen-detector'));

  beforeEach(angular.mock.inject(function(_$window_, _touchscreenDetectorService_) {
    touchscreenDetectorService = _touchscreenDetectorService_;
    $window = _$window_;
  }));

  describe('the hasTouchscreen function', function() {

    it('should return true if navigator.maxTouchPoints is > 0', function() {
      $window.navigator.maxTouchPoints = 1;

      expect(touchscreenDetectorService.hasTouchscreen()).to.be.true;
    });

    it('should return false if navigator.maxTouchPoints is 0', function() {
      $window.navigator.maxTouchPoints = 0;

      expect(touchscreenDetectorService.hasTouchscreen()).to.be.false;
    });

    it('should return true if navigator.msMaxTouchPoints is > 0', function() {
      $window.navigator.maxTouchPoints = 1;

      expect(touchscreenDetectorService.hasTouchscreen()).to.be.true;
    });

    it('should return false if navigator.msMaxTouchPoints is 0', function() {
      $window.navigator.msMaxTouchPoints = 0;

      expect(touchscreenDetectorService.hasTouchscreen()).to.be.false;
    });

    it('should return true if $window contains ontouchstart', function() {
      $window.ontouchstart = true;

      expect(touchscreenDetectorService.hasTouchscreen()).to.be.true;
    });

    it('should return false if $window does not implements ontouchstart', function() {
      expect(touchscreenDetectorService.hasTouchscreen()).to.be.false;
    });
  });
});
