/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

properties = {

	rdfService: Components.classes["@mozilla.org/rdf/rdf-service;1"].
	                   getService(Components.interfaces.nsIRDFService),
	resources: Components.classes["@blueprintit.co.uk/online-bookmarks-resources;1"].
                   	getService(Components.interfaces.nsIOBResources),
	                          
	dbservice: null,
	resource: null,
	
	apply: function()
	{
		try
		{
			var input = document.getElementById("url");
			if (properties.resource==null)
			{
				properties.resource=properties.dbservice.createBookmark(input.value);
			}
			properties.dbservice.datasource.SetStringTarget(properties.resource,properties.resources.NC_URL,input.value);
			input = document.getElementById("name");
			properties.dbservice.datasource.SetStringTarget(properties.resource,properties.resources.NC_Name,input.value);
			input = document.getElementById("tags");
			properties.dbservice.setAllTags(properties.resource,input.value);
			input = document.getElementById("description");
			properties.dbservice.datasource.SetStringTarget(properties.resource,properties.resources.NC_Description,input.value);
			properties.dbservice.updateBookmark(properties.resource);
		}
		catch (e)
		{
			dump(e);
		}
		return true;
	},
	
	init: function()
	{
		var arg = window.arguments[0];
		properties.dbservice=arg.dbservice;
		
		if (arg.resource!=null)
		{
			if (arg.resource instanceof Components.interfaces.nsIRDFResource)
			{
				properties.resource=arg.resource;
				//dump("init resource - "+properties.resource.Value+"\n");
			}
			else
			{
				properties.resource=properties.rdfService.GetResource(arg.resource);
				//dump("init resource - "+properties.resource.Value+"\n");
			}
		}
			
		input = document.getElementById("name");
		
		if (properties.resource==null)
		{
			//input = document.getElementById("name");
			if (arg.title!=null)
			{
				input.value=arg.title;
			}
			else
			{
				input.value="New Bookmark";
			}
			input = document.getElementById("tags");
			input.value="";
			input = document.getElementById("url");
			if (arg.url!=null)
			{
				input.value=arg.url;
			}
			else
			{
				input.value="";
			}
			input = document.getElementById("description");
			input.value="";
		}
		else
		{
			//input = document.getElementById("name");
			input.value=properties.dbservice.datasource.GetStringTarget(properties.resource,properties.resources.NC_Name);
			input = document.getElementById("tags");
			input.value=properties.dbservice.getTagsAsString(properties.resource);
			input = document.getElementById("url");
			input.value=properties.dbservice.datasource.GetStringTarget(properties.resource,properties.resources.NC_URL);
			input.disabled=true;
			input = document.getElementById("description");
			input.value=properties.dbservice.datasource.GetStringTarget(properties.resource,properties.resources.NC_Description);
		}
	}
}

window.addEventListener("load",properties.init,false);
