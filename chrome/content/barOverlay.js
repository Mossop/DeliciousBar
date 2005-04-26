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
		openDialog("chrome://deliciousbar/content/properties.xul","","modal,dialog",args);
	  deliciousBar.toolbar.builder.rebuild();
	},
	
	addMainFolder: function()
	{
		var args = {
			dbservice: deliciousBar.dbservice,
			root: false,
			parent: deliciousBar.dbservice.NC_BookmarksRoot,
			resource: null
		}
		openDialog("chrome://deliciousbar/content/properties.xul","","modal,dialog",args);
	  deliciousBar.toolbar.builder.rebuild();
	},
	
	removeFolder: function()
	{
	  var menu = document.getElementById(document.popupNode.id);
	  var parent;
	  if (menu.parentNode.tagName=="hbox")
	  {
	  	parent=deliciousBar.dbservice.NC_BookmarksRoot;
	  }
	  else
	  {
			var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].
                   	getService(Components.interfaces.nsIRDFService);
	  	parent=rdfService.GetResource(menu.parentNode.parentNode.id);
	  }
		deliciousBar.dbservice.deleteFolder(parent);
	  deliciousBar.toolbar.builder.rebuild();
	},
	
	editMainFolder: function()
	{
		var args = {
			dbservice: deliciousBar.dbservice,
			root: true,
			parent: null,
			resource: deliciousBar.dbservice.NC_BookmarksRoot
		}
		openDialog("chrome://deliciousbar/content/properties.xul","","modal,dialog",args);
	  deliciousBar.toolbar.builder.rebuild();
	},
	
	editFolder: function()
	{
		var args = {
			dbservice: deliciousBar.dbservice,
			root: false,
			parent: null,
			resource: document.popupNode.id
		}
		openDialog("chrome://deliciousbar/content/properties.xul","","modal,dialog",args);
	  deliciousBar.toolbar.builder.rebuild();
	}
}

window.addEventListener("load",deliciousBar.init,false);
