/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

deliciousBar = {

	dbservice: null,
	shownmenu: null,
	toolbar: null,
	
	init: function()
	{
		deliciousBar.dbservice = Components.classes["@blueprintit.co.uk/delicious-bar-service;1"].
	                   getService(Components.interfaces.nsIDeliciousBarService);
	  deliciousBar.toolbar = document.getElementById("delicious-ptf");
	  deliciousBar.toolbar.database.AddDataSource(deliciousBar.dbservice.datasource);
	  deliciousBar.toolbar.builder.rebuild();
	},
	
	buttonMouseOver: function(event)
	{
		if ((deliciousBar.shownmenu!=null)&&(event.target.tagName=="toolbarbutton"))
		{
			//dump("buttonMouseOver\n");
			var newPopup=event.target.firstChild;
			while ((newPopup!=null)&&((newPopup.nodeType!=Node.ELEMENT_NODE)||(newPopup.tagName!="menupopup")))
			{
				newPopup=newPopup.nextSibling;
			}
			if (newPopup!=null)
			{
				if (newPopup!=deliciousBar.shownmenu)
				{
					deliciousBar.shownmenu.hidePopup();
					newPopup.showPopup(event.target,-1,-1,"popup","bottomleft","topleft");
				}
			}
			else
			{
				dump("No popup found\n");
			}
		}
	},
	
	popupShown: function(event)
	{
		if (event.target.parentNode.tagName=="toolbarbutton")
		{
			//dump("popupShown\n");
			deliciousBar.shownmenu=event.target;
		}
	},
	
	popupHidden: function(event)
	{
		if (event.target.parentNode.tagName=="toolbarbutton")
		{
			//dump("popupHidden\n");
			deliciousBar.shownmenu=null;
		}
	},
	
	addFolder: function()
	{
		var args = {
			dbservice: deliciousBar.dbservice,
			parent: document.popupNode.id,
			root: false,
			resource: null
		}
		openDialog("chrome://deliciousbar/content/folderProperties.xul","","modal,dialog",args);
	},
	
	addMainFolder: function()
	{
		var args = {
			dbservice: deliciousBar.dbservice,
			root: false,
			parent: deliciousBar.dbservice.NC_BookmarksRoot,
			resource: null
		}
		openDialog("chrome://deliciousbar/content/folderProperties.xul","","modal,dialog",args);
	},
	
	removeFolder: function()
	{
		var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].
                   	getService(Components.interfaces.nsIRDFService);
	  var folder=rdfService.GetResource(document.popupNode.id);
		deliciousBar.dbservice.deleteFolder(folder);
	},
	
	editMainFolder: function()
	{
		var args = {
			dbservice: deliciousBar.dbservice,
			root: true,
			parent: null,
			resource: deliciousBar.dbservice.NC_BookmarksRoot
		}
		openDialog("chrome://deliciousbar/content/folderProperties.xul","","modal,dialog",args);
	},
	
	editFolder: function()
	{
		var args = {
			dbservice: deliciousBar.dbservice,
			root: false,
			parent: null,
			resource: document.popupNode.id
		}
		openDialog("chrome://deliciousbar/content/folderProperties.xul","","modal,dialog",args);
	},
	
	removeBookmark: function()
	{
	  var bookmark = document.popupNode.id;
		//deliciousBar.dbservice.deleteBookmark(bookmark);
	},
	
	editBookmark: function()
	{
		var args = {
			dbservice: deliciousBar.dbservice,
			resource: document.popupNode.id
		}
		openDialog("chrome://deliciousbar/content/bookmarkProperties.xul","","modal,dialog",args);
	}
}

window.addEventListener("load",deliciousBar.init,false);
