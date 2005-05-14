/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

function nsOBResources()
{
	var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].
                   	getService(Components.interfaces.nsIRDFService);
                   	
	this.NC_Name = 							rdfService.GetResource(this.NC+"Name");
	this.NC_URL = 							rdfService.GetResource(this.NC+"URL");
	this.NC_BookmarksRoot = 		rdfService.GetResource(this.NC+"BookmarksRoot");
	this.NC_Description = 			rdfService.GetResource(this.NC+"Description");
	this.NC_Bookmark = 					rdfService.GetResource(this.NC+"Bookmark");
	this.NC_Folder = 						rdfService.GetResource(this.NC+"Folder");
	this.NC_Icon = 							rdfService.GetResource(this.NC+"Icon");
	this.WEB_Modified = 				rdfService.GetResource(this.WEB+"LastModifiedDate");
	this.RDF_Type = 						rdfService.GetResource(this.RDF+"type");
	this.DLC_PostRoot = 				rdfService.GetResource(this.DLC+"Posts");
	this.DLC_TagRoot = 					rdfService.GetResource(this.DLC+"Tags");
	this.DLC_Tag = 							rdfService.GetResource(this.DLC+"Tag");
	this.DLC_TagName = 					rdfService.GetResource(this.DLC+"TagName");
	this.DLBAR_AllTags = 				rdfService.GetResource(this.DLBAR+"AllTags");
	this.DLBAR_AnyTags = 				rdfService.GetResource(this.DLBAR+"AnyTags");
	this.DLBAR_NoneTags = 			rdfService.GetResource(this.DLBAR+"NoneTags");
}

nsOBResources.prototype =
{                         
	NC: "http://home.netscape.com/NC-rdf#",
	NC_Name: null,
	NC_URL: null,
	NC_BookmarksRoot: null,
	NC_Bookmark: null,
	NC_Description: null,
	NC_Folder: null,
	NC_Icon: null,
	
	WEB: "http://home.netscape.com/WEB-rdf#",
	WEB_Modified: null,
	
	RDF: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
	RDF_Type: null,
	
	DLC: "http://del.icio.us#",
	DLC_PostRoot: null,
	DLC_TagRoot: null,
	DLC_Tag: null,
	DLC_TagName: null,
	
	DLBAR: "http://www.blueprintit.co.uk/~dave/web/firefox/deliciousbar#",
	DLBAR_AllTags: null,
	DLBAR_AnyTags: null,
	DLBAR_NoneTags: null,
	
	QueryInterface: function(iid)
	{
		if (iid.equals(Components.interfaces.nsIOBResources)
			|| iid.equals(Components.interfaces.nsISupports)
			|| iid.equals(Components.interfaces.nsIObserver))
		{
			return this;
		}
		else
		{
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}
	}
}

var initModule =
{
	ServiceCID: Components.ID("{d506ebe6-3855-4c72-8047-3a807acfdff4}"),
	ServiceContractID: "@blueprintit.co.uk/online-bookmarks-resources;1",
	ServiceName: "Online Bookmarks Resources",
	
	registerSelf: function (compMgr, fileSpec, location, type)
	{
		compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		compMgr.registerFactoryLocation(this.ServiceCID,this.ServiceName,this.ServiceContractID,
			fileSpec,location,type);
	},

	unregisterSelf: function (compMgr, fileSpec, location)
	{
		compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		compMgr.unregisterFactoryLocation(this.ServiceCID,fileSpec);
	},

	getClassObject: function (compMgr, cid, iid)
	{
		if (!cid.equals(this.ServiceCID))
			throw Components.results.NS_ERROR_NO_INTERFACE
		if (!iid.equals(Components.interfaces.nsIFactory))
			throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
		return this.serviceFactory;
	},

	canUnload: function(compMgr)
	{
		return true;
	},

	serviceFactory:
	{
		service: null,
		
		createInstance: function (outer, iid)
		{
			if (outer != null)
				throw Components.results.NS_ERROR_NO_AGGREGATION;
			if (this.service==null)
			{
				this.service=new nsOBResources();
			}
			return this.service.QueryInterface(iid);
		}
	}
}; //Module

function NSGetModule(compMgr, fileSpec)
{
	return initModule;
}
