/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"buildmyproperty/download-drawings/test/integration/AllJourneys"
	], function () {
		QUnit.start();
	});
});