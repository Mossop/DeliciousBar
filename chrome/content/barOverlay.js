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
	  deliciousBar.dbservice.init();
	  deliciousBar.toolbar.database.AddDataSource(deliciousBar.dbservice.datasource);
	  deliciousBar.toolbar.builder.rebuild();
	  
	  getBrowser().addEventListener("load", function(evt) { setTimeout(deliciousBar.browserLoad, 500, evt); }, true);
	},
	
	browserLoad: function(event)
	{
	  var targetBrowser = null;
	  var gBrowser = getBrowser();
	  if (gBrowser.mTabbedMode)
	  {
	    var targetBrowserIndex = gBrowser.getBrowserIndexForDocument(event.originalTarget);
	    if (targetBrowserIndex == -1)
	      return;
	    targetBrowser = gBrowser.getBrowserAtIndex(targetBrowserIndex);
	  }
	  else
	  {
	    targetBrowser = gBrowser.mCurrentBrowser;
	  }
	  var uri = targetBrowser.currentURI.spec;
	  if (gBrowser.shouldLoadFavIcon(targetBrowser.currentURI))
	  {
		  var favicon = targetBrowser.mFavIconURL;
		  if (favicon==null)
		  {
		  	favicon=gBrowser.buildFavIconString(targetBrowser.currentURI);
		  	
		  }
		  if (!gBrowser.isFavIconKnownMissing(favicon))
		 	{
			  deliciousBar.dbservice.setLocationIcon(uri,favicon);
			}
	 	}
	},
	
	hideCurrentPopup: function()
	{
		if (deliciousBar.shownmenu!=null)
		{
			deliciousBar.shownmenu.hidePopup();
		}
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
	
	addBookmark: function()
	{
		var args = {
			dbservice: deliciousBar.dbservice,
			url: null,
			title: window._content.document.title,
			resource: null
		}
    var expandedContentBaseBox = document.getElementById("expandedcontent-baseBox");
    if (expandedContentBaseBox)
    {
    	args.url=document.getAnonymousElementByAttribute(expandedContentBaseBox,"anonid","headerValue").value;
    }
    if (!args.url)
   	{
      args.url=window._content.document.location.href;
    }
    args.resource=deliciousBar.dbservice.getBookmark(args.url);
		openDialog("chrome://deliciousbar/content/bookmarkProperties.xul","","modal,dialog,centerscreen",args);
	},
	
	addFolder: function()
	{
		deliciousBar.hideCurrentPopup();
		var args = {
			dbservice: deliciousBar.dbservice,
			parent: document.popupNode.id,
			root: false,
			resource: null
		}
		openDialog("chrome://deliciousbar/content/folderProperties.xul","","modal,dialog,centerscreen",args);
	},
	
	addMainFolder: function()
	{
		deliciousBar.hideCurrentPopup();
		var args = {
			dbservice: deliciousBar.dbservice,
			root: false,
			parent: deliciousBar.dbservice.NC_BookmarksRoot,
			resource: null
		}
		openDialog("chrome://deliciousbar/content/folderProperties.xul","","modal,dialog,centerscreen",args);
	},
	
	removeFolder: function()
	{
		deliciousBar.hideCurrentPopup();
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
		openDialog("chrome://deliciousbar/content/folderProperties.xul","","modal,dialog,centerscreen",args);
	},
	
	editFolder: function()
	{
		deliciousBar.hideCurrentPopup();
		var args = {
			dbservice: deliciousBar.dbservice,
			root: false,
			parent: null,
			resource: document.popupNode.id
		}
		openDialog("chrome://deliciousbar/content/folderProperties.xul","","modal,dialog,centerscreen",args);
	},
	
	removeBookmark: function()
	{
		deliciousBar.hideCurrentPopup();
		var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].
                   	getService(Components.interfaces.nsIRDFService);
	  var bookmark = rdfService.GetResource(document.popupNode.id);
		if (!deliciousBar.dbservice.deleteBookmark(bookmark))
		{
			alert("Could not delete bookmark from del.icio.us");
		}
	},
	
	editBookmark: function()
	{
		deliciousBar.hideCurrentPopup();
		var args = {
			dbservice: deliciousBar.dbservice,
			resource: document.popupNode.id
		}
		openDialog("chrome://deliciousbar/content/bookmarkProperties.xul","","modal,dialog,centerscreen",args);
	}
}

window.addEventListener("load",deliciousBar.init,false);
