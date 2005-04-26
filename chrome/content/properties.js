properties = {

	rdfService: Components.classes["@mozilla.org/rdf/rdf-service;1"].
	                   getService(Components.interfaces.nsIRDFService),
	                          
	dbservice: null,
	resource: null,
	parent: null,
	
	apply: function()
	{
		try
		{
			if (properties.resource==null)
			{
				properties.resource=properties.dbservice.createFolder(properties.parent);
			}
			var input = document.getElementById("name");
			properties.dbservice.datasource.SetStringTarget(properties.resource,properties.dbservice.NC_Name,input.value);
			input = document.getElementById("alltags");
			properties.dbservice.datasource.SetStringTarget(properties.resource,properties.dbservice.DLBAR_AllTags,input.value);
			input = document.getElementById("anytags");
			properties.dbservice.datasource.SetStringTarget(properties.resource,properties.dbservice.DLBAR_AnyTags,input.value);
			input = document.getElementById("nonetags");
			properties.dbservice.datasource.SetStringTarget(properties.resource,properties.dbservice.DLBAR_NoneTags,input.value);
			input = document.getElementById("description");
			properties.dbservice.datasource.SetStringTarget(properties.resource,properties.dbservice.NC_Description,input.value);
			properties.dbservice.updateFolder(properties.resource);
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
			
		if (arg.parent!=null)
		{
			if (arg.parent instanceof Components.interfaces.nsIRDFResource)
			{
				properties.parent = arg.parent;
				//dump("init parent - "+properties.parent.Value+"\n");
			}
			else
			{
				properties.parent = properties.rdfService.GetResource(arg.parent)
				//dump("init parent - "+properties.parent.Value+"\n");
			}
		}
		
		if ((arg.parent==null)&&(arg.resource==null))
		{
			dump("Both parent and resource were null. This is bad.\n");
		}
		
		var input = document.getElementById("descriptionrow");
		input.hidden=arg.root;
		input = document.getElementById("name");
		input.disabled=arg.root;
		
		if (properties.resource==null)
		{
			//input = document.getElementById("name");
			input.value="New Folder";
			input = document.getElementById("alltags");
			input.value="";
			input = document.getElementById("anytags");
			input.value="";
			input = document.getElementById("nonetags");
			input.value="";
			input = document.getElementById("description");
			input.value="";
		}
		else
		{
			//input = document.getElementById("name");
			input.value=properties.dbservice.datasource.GetStringTarget(properties.resource,properties.dbservice.NC_Name);
			input = document.getElementById("alltags");
			input.value=properties.dbservice.datasource.GetStringTarget(properties.resource,properties.dbservice.DLBAR_AllTags);
			input = document.getElementById("anytags");
			input.value=properties.dbservice.datasource.GetStringTarget(properties.resource,properties.dbservice.DLBAR_AnyTags);
			input = document.getElementById("nonetags");
			input.value=properties.dbservice.datasource.GetStringTarget(properties.resource,properties.dbservice.DLBAR_NoneTags);
			input = document.getElementById("description");
			input.value=properties.dbservice.datasource.GetStringTarget(properties.resource,properties.dbservice.NC_Description);
		}
	}
}

window.addEventListener("load",properties.init,false);
