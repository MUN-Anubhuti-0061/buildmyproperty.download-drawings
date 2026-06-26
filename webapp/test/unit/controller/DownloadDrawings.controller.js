/*global QUnit*/

sap.ui.define([
	"buildmyproperty/download-drawings/controller/DownloadDrawings.controller"
], function (Controller) {
	"use strict";

	QUnit.module("DownloadDrawings Controller");

	QUnit.test("I should test the DownloadDrawings controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});