sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function (
	Controller,
	JSONModel,
	Filter,
	FilterOperator,
	MessageBox,
	MessageToast
) {
	"use strict";

	return Controller.extend("buildmyproperty.download-drawings.controller.DownloadDrawings", {

		_getText: function (sKey, aArgs) {

			var oBundle = this.getOwnerComponent()
				.getModel("i18n")
				.getResourceBundle();

			return oBundle.getText(sKey, aArgs || []);
		},

		_updateToolbarTexts: function () {

			var oVM = this.getView().getModel("viewModel");

			oVM.setProperty(
				"/tableTitle",
				this._getText("tableTitle", [
					oVM.getProperty("/totalCount")
				])
			);

			oVM.setProperty(
				"/downloadText",
				this._getText("download", [
					oVM.getProperty("/selectedCount")
				])
			);
		},

		onInit: function () {

			var sCaseId = "";
			var oComponentData = this.getOwnerComponent().getComponentData();

			if (
				oComponentData &&
				oComponentData.startupParameters &&
				oComponentData.startupParameters.CaseID
			) {
				sCaseId = oComponentData.startupParameters.CaseID[0];
			}

			if (!sCaseId) {
				sCaseId = jQuery.sap.getUriParameters().get("CaseID");
			}

			this._sCaseId = sCaseId || "";

			this.getView().setModel(new JSONModel({
				caseId: this._sCaseId,
				selectedCount: 0,
				totalCount: 0,
				tableTitle: "",
				downloadText: ""
			}), "viewModel");

			this.getView().setModel(new JSONModel({
				results: []
			}), "attachModel");

			this._updateToolbarTexts();

			this._loadAttachments();
			// Prevent focus on close button
			var oCloseBtn = this.getView().byId("btnClose");
			if (oCloseBtn) {
				this.getView().attachAfterOpen(function () {
					oCloseBtn.$().blur();
				});
			}
		},

		_loadAttachments: function () {

			var oODataModel = this.getView().getModel();
			var that = this;

			this.byId("table").setBusy(true);

			var oFilter = new Filter(
				"CaseID",
				FilterOperator.EQ,
				this._sCaseId
			);

			oODataModel.read("/AttachmentSet", {
				filters: [oFilter],

				success: function (oData) {

					var aResults = [];

					if (oData && oData.results) {
						aResults = oData.results;
					}

					that.getView().getModel("attachModel").setData({
						results: aResults
					});

					var oVM = that.getView().getModel("viewModel");

					oVM.setProperty("/totalCount", aResults.length);

					that._updateToolbarTexts();

					that.byId("table").setBusy(false);
				},

				error: function () {

					that.byId("table").setBusy(false);

					MessageBox.error(
						that._getText("msgLoadError"), {

							styleClass: "rakMessageBox"
						}
					);
				}
			});
		},
		onAfterRendering: function () {
			setTimeout(() => {
				if (document.activeElement &&
					document.activeElement.classList.contains("closeIconBtn")) {
					document.activeElement.blur();
				}
			}, 0);
		},
		onSelectionChange: function () {

			var oVM = this.getView().getModel("viewModel");

			oVM.setProperty(
				"/selectedCount",
				this.byId("table").getSelectedItems().length
			);

			this._updateToolbarTexts();
		},

		onSearch: function (oEvent) { //Search Field

			var sValue = oEvent.getParameter("newValue") || "";
			var oBinding = this.byId("table").getBinding("items");

			if (!oBinding) {
				return;
			}

			if (!sValue) {
				oBinding.filter([]);
				return;
			}

			var aFilters = [
				new Filter("FileName", FilterOperator.Contains, sValue),
				new Filter("Building", FilterOperator.Contains, sValue),
				new Filter("DrawingType", FilterOperator.Contains, sValue),
				new Filter("SheetNo", FilterOperator.Contains, sValue),
				new Filter("Status", FilterOperator.Contains, sValue),
				new Filter("StatusText", FilterOperator.Contains, sValue)
			];

			oBinding.filter(new Filter({
				filters: aFilters,
				and: false
			}));
		},

		onRefresh: function () { //Refresh Button
			this._loadAttachments();
		},
		onDownload: function () { //Download Button

			var that = this;
			var oView = this.getView();
			var oBtn = this.byId("btndownload");

			var oTable = this.byId("table");
			var aSelectedItems = oTable.getSelectedItems();

			if (!aSelectedItems || aSelectedItems.length === 0) {
				MessageBox.information(
					this._getText("msgSelectDocument"), {

						styleClass: "rakMessageBox"
					}
				);
				return;
			}
			if (oBtn) {
				oBtn.setBusy(true);
			}
			oView.setBusy(true);
			var aKeys = [];

			aSelectedItems.forEach(function (oItem) {

				var oData = oItem.getBindingContext("attachModel").getObject();

				aKeys.push(
					oData.Dokar + "|" +
					oData.Dokvr + "|" +
					oData.Doktl + "|" +
					oData.Doknr
				);
			});

			var sKey = aKeys.join(",");
			var oModel = oView.getModel();

			var sUrl =
				oModel.sServiceUrl +
				"/AttachmentDataSet(Key='" +
				encodeURIComponent(sKey) +
				"')/$value";

			oView.setBusy(true);

			fetch(sUrl, {
					method: "GET",
					credentials: "same-origin"
				})
				.then(function (response) {

					if (!response.ok) {

						return response.text().then(function (text) {

							oView.setBusy(false);

							if (oBtn) {
								oBtn.setBusy(false);
							}

							var sMessage = that._getText("unknownError");

							try {

								var parser = new DOMParser();
								var xmlDoc = parser.parseFromString(text, "text/xml");

								var oMsg = xmlDoc.querySelector("error > message");

								if (oMsg && oMsg.textContent) {
									sMessage = oMsg.textContent;
								}

							} catch (e) {
								sMessage = text;
							}

							MessageBox.error(sMessage, {
								styleClass: "rakMessageBox"
							});
						});
					}

					var reader = response.body.getReader();
					var chunks = [];

					return new Promise(function (resolve, reject) {

							function readChunk() {

								reader.read().then(function (result) {

									if (result.done) {
										resolve(new Blob(chunks));
										return;
									}

									chunks.push(result.value);
									readChunk();

								}).catch(reject);
							}

							readChunk();
						})
						.then(function (blob) {

							var disposition = response.headers.get("Content-Disposition");
							var fileName = that._getText("downloadFileName");

							if (disposition && disposition.indexOf("filename=") !== -1) {

								var match = disposition.match(/filename="?([^"]+)"?/);

								if (match && match[1]) {
									fileName = match[1];
								}
							}

							var url = window.URL.createObjectURL(blob);

							var a = document.createElement("a");
							a.style.display = "none";
							a.href = url;
							a.download = fileName;

							document.body.appendChild(a);
							a.click();

							setTimeout(function () {

								document.body.removeChild(a);
								window.URL.revokeObjectURL(url);

								oView.setBusy(false);

								if (oBtn) {
									oBtn.setBusy(false);
								}
								MessageToast.show(
									that._getText("msgDownloadCompleted"), {
										styleClass: "sapMMessageToast"
									}
								);
							}, 500);

						});
				})
				.catch(function () {

					oView.setBusy(false);

					if (oBtn) {
						oBtn.setBusy(false);
					}

					MessageBox.error(
						that._getText("msgNetworkError"), {

							styleClass: "rakMessageBox"
						}
					);
				});
		},
		onCloseView: function () { //Close Button
			window.close();
		},
		onPersonalize: function () { //Personalize Button
			var that = this;
			var oTable = this.byId("table");
			var aColumns = oTable.getColumns();

			if (!this._oDialog) {
				var oList = new sap.m.List({
					mode: "MultiSelect",
					includeItemInSelection: true
				});

				aColumns.forEach(function (col, index) {
					var oHeader = col.getHeader();
					var sText = oHeader ? oHeader.getText() : "";
					var bSelected = true;
					if (sText === that._getText("status")) {
						bSelected = false;
					}
					oList.addItem(
						new sap.m.StandardListItem({
							title: sText,
							selected: bSelected,
							customData: [
								new sap.ui.core.CustomData({
									key: "index",
									value: index
								})
							]
						})
					);
				});

				// Apply Button with RAK styling
				var oApplyButton = new sap.m.Button({
					text: this._getText("apply"),
					type: "Transparent",
					press: function (oEvent) {
						var oDialog = oEvent.getSource().getParent();
						var oList = oDialog.getContent()[0];
						var aSelectedItems = oList.getSelectedItems();
						var aColumns = oTable.getColumns();
						for (var i = 0; i < aColumns.length; i++) {
							aColumns[i].setVisible(false);
						}
						for (var j = 0; j < aSelectedItems.length; j++) {
							var idx = aSelectedItems[j]
								.getCustomData()[0]
								.getValue();
							aColumns[idx].setVisible(true);
						}
						oDialog.close();
					}
				});
				oApplyButton.addStyleClass("rakBtn");

				// Close Button with Emphasized style
				var oCloseButton = new sap.m.Button({
					text: this._getText("close"),
					type: "Transparent",
					press: function (oEvent) {
						oEvent.getSource().getParent().close();
					}
				});
				oCloseButton.addStyleClass("rakBtn");
				// Dialog with personalization styling
				this._oDialog = new sap.m.Dialog({
					title: this._getText("personalizeTitle"),
					contentWidth: "300px",
					content: oList,
					beginButton: oApplyButton,
					endButton: oCloseButton
				});

				this._oDialog.addStyleClass("personalizationDialog");
			}

			this._oDialog.open();
		},
		onItemPress: function (oEvent) {
			var oItem = oEvent.getParameter("listItem");
			var oTable = this.byId("drawingTable");

			oTable.setSelectedItem(
				oItem, !oItem.isSelected()
			);
		}
	});
});