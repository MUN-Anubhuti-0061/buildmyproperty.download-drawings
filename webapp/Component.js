sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/resource/ResourceModel"
], function (UIComponent, ResourceModel) {
    "use strict";

    return UIComponent.extend("buildmyproperty.download-drawings.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {

            UIComponent.prototype.init.apply(this, arguments);

            // i18n model
            var oI18nModel = new ResourceModel({
                bundleName: "buildmyproperty.download-drawings.i18n.i18n"
            });

            this.setModel(oI18nModel, "i18n");
            var oRouter = this.getRouter();

            if (oRouter) {
                oRouter.initialize();
            }
        }
    });
});