/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

function nsRDFUtilDataSource()
{
}

nsRDFUtilDataSource.prototype =
{
	rdfService: Components.classes["@mozilla.org/rdf/rdf-service;1"].
	                   getService(Components.interfaces.nsIRDFService),
	rdfContainerUtils: Components.classes["@mozilla.org/rdf/container-utils;1"].
	                   getService(Components.interfaces.nsIRDFContainerUtils),
	
	datasource: null,
	
	Init: function(ds)
	{
		this.datasource=ds;
	},

	IsAlt: function(resource)
	{
		return this.rdfContainerUtils.IsAlt(this.datasource,resource);
	},
	
	IsBag: function(resource)
	{
		return this.rdfContainerUtils.IsBag(this.datasource,resource);
	},
	
	IsContainer: function(resource)
	{
		return this.rdfContainerUtils.IsContainer(this.datasource,resource);
	},
	
	IsEmpty: function(resource)
	{
		return this.rdfContainerUtils.IsEmpty(this.datasource,resource);
	},
	
	IsSeq: function(resource)
	{
		return this.rdfContainerUtils.IsSeq(this.datasource,resource);
	},
	
	MakeAlt: function(resource)
	{
		if (this.IsAlt(resource))
		{
			var container = Components.classes["@mozilla.org/rdf/container;1"].
		                  createInstance(Components.interfaces.nsIRDFContainer);
		  container.Init(this.datasource,resource);
		  return container;
		}
		else
		{
			return this.rdfContainerUtils.MakeAlt(this.datasource,resource);
		}
	},
	
	MakeBag: function(resource)
	{
		if (this.IsBag(resource))
		{
			var container = Components.classes["@mozilla.org/rdf/container;1"].
		                  createInstance(Components.interfaces.nsIRDFContainer);
		  container.Init(this.datasource,resource);
		  return container;
		}
		else
		{
			return this.rdfContainerUtils.MakeBag(this.datasource,resource);
		}
	},
	
	MakeSeq: function(resource)
	{
		if (this.IsSeq(resource))
		{
			var container = Components.classes["@mozilla.org/rdf/container;1"].
		                  createInstance(Components.interfaces.nsIRDFContainer);
		  container.Init(this.datasource,resource);
		  return container;
		}
		else
		{
			return this.rdfContainerUtils.MakeSeq(this.datasource,resource);
		}
	},
	
	DeleteResource: function(resource)
	{
		var props = this.ArcLabelsOut(resource);
		while (props.hasMoreElements())
		{
			var prop = props.getNext();
			var targets = this.GetTargets(resource,prop,true);
			while (targets.hasMoreElements())
			{
				var target = targets.getNext();
				this.Unassert(resource,prop,target);
			}
		}
	},
	
	GetResourceTarget: function(resource,property)
	{
		var node = this.GetTarget(resource,property,true);
		if (node instanceof Components.interfaces.nsIRDFResource)
		{
			return node;
		}
		else
		{
			return null;
		}
	},
	
	GetBoolTarget: function(resource,property)
	{
		var node = this.GetTarget(resource,property,true);
		if (node instanceof Components.interfaces.nsIRDFIntLiteral)
		{
			return node.Value!=0;
		}
		else
		{
			return null;
		}
	},
	
	GetIntTarget: function(resource,property)
	{
		var node = this.GetTarget(resource,property,true);
		if (node instanceof Components.interfaces.nsIRDFIntLiteral)
		{
			return node.Value;
		}
		else
		{
			return null;
		}
	},
	
	GetStringTarget: function(resource,property)
	{
		var node = this.GetTarget(resource,property,true);
		if (node instanceof Components.interfaces.nsIRDFLiteral)
		{
			return node.Value;
		}
		else
		{
			return null;
		}
	},
	
	ClearTargets: function(resource,property)
	{
		var targets = this.GetTargets(resource,property,true);
		while (targets.hasMoreElements())
		{
			var target = targets.getNext();
			this.Unassert(resource,property,target);
		}
	},
	
	SetResourceTarget: function(resource,property,value)
	{
		this.ClearTargets(resource,property);
		this.Assert(resource,property,value,true);
	},
	
	SetBoolTarget: function(resource,property,value)
	{
		this.ClearTargets(resource,property);
		var node;
		if (value)
		{
			node=this.rdfService.GetIntLiteral(1);
		}
		else
		{
			node=this.rdfService.GetIntLiteral(0);
		}
		this.Assert(resource,property,node,true);
	},
	
	SetIntTarget: function(resource,property,value)
	{
		this.ClearTargets(resource,property);
		this.Assert(resource,property,this.rdfService.GetIntLiteral(value),true);
	},
	
	SetStringTarget: function(resource,property,value)
	{
		this.ClearTargets(resource,property);
		this.Assert(resource,property,this.rdfService.GetLiteral(value),true);
	},
	
	Refresh: function(blocking)
	{
		try
		{
			var remote = this.datasource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
			if (remote!=null)
			{
				remote.Refresh(blocking);
				if (!remote.loaded)
				{
					dump("Datasource did not load properly\n");
				}
			}
		}
		catch (e)
		{
			dump(e+"\n");
		}
	},
	
	Flush: function()
	{
		try
		{
			var remote = this.datasource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
			if (remote!=null)
			{
				remote.Flush();
			}
		}
		catch (e)
		{
			dump(e+"\n");
		}
	},
	
	// Start of nsIRDFDataSource implementation
	AddObserver: function(observer)
	{
		this.datasource.AddObserver(observer);
	},
	
	ArcLabelsIn: function(node)
	{
		return this.datasource.ArcLabelsIn(node);
	},
	
	ArcLabelsOut: function(node)
	{
		return this.datasource.ArcLabelsOut(node);
	},
	
	Assert: function(source,property,target,truth)
	{
		this.datasource.Assert(source,property,target,truth);
	},
	
	beginUpdateBatch: function()
	{
		this.datasource.beginUpdateBatch();
	},
	
	Change: function(source,property,oldtarget,newtarget)
	{
		this.datasource.Change(source,property,oldtarget,newtarget);
	},
	
	DoCommand: function(sources,command,arguments)
	{
		this.datasource.DoCommand(sources,command,arguments);
	},
	
	endUpdateBatch: function()
	{
		this.datasource.endUpdateBatch();
	},
	
	GetAllCmds: function(source)
	{
		return this.datasource.GetAllCmds(source);
	},
	
	GetAllResources: function()
	{
		return this.datasource.GetAllResources();
	},
	
	GetSource: function(property,target,truth)
	{
		return this.datasource.GetSource(property,target,truth);
	},
	
	GetSources: function(property,target,truth)
	{
		return this.datasource.GetSources(property,target,truth);
	},
	
	GetTarget: function(source,property,truth)
	{
		return this.datasource.GetTarget(source,property,truth);
	},
	
	GetTargets: function(source,property,truth)
	{
		return this.datasource.GetTargets(source,property,truth);
	},
	
	hasArcIn: function(node,arc)
	{
		return this.datasource.hasArcIn(node,arc);
	},
	
	hasArcOut: function(source,arc)
	{
		return this.datasource.hasArcOut(source,arc);
	},
	
	HasAssertion: function(source,property,target,truth)
	{
		return this.datasource.HasAssertion(source,property,target,truth);
	},
	
	IsCommandEnabled: function(sources,command,arguments)
	{
		return this.datasource.IsCommandEnabled(sources,command,arguments);
	},
	
	Move: function(oldsource,newsource,property,target)
	{
		this.datasource.Move(oldsource,newsource,property,target);
	},
	
	RemoveObserver: function(observer)
	{
		this.datasource.RemoveObserver(observer);
	},
	
	Unassert: function(source,property,target)
	{
		this.datasource.Unassert(source,property,target);
	},
	// End of nsIRDFDataSource implementation
	
	// Start of nsISupports implementation
	QueryInterface: function (iid)
	{
		if (iid.equals(Components.interfaces.nsIRDFUtilDataSource)
			|| iid.equals(Components.interfaces.nsISupports)
			|| iid.equals(Components.interfaces.nsIObserver))
		{
			return this;
		}
		else (iid.equals(Components.interfaces.nsIRDFRemoteDataSource))
		{
			return this.datasource.QueryInterface(iid);
		}
	}
	// End of nsISupports implementation
}

var initModule =
{
	ServiceCID: Components.ID("{03a342ee-2fef-4660-be0c-3ca80a3219ab}"),
	ServiceContractID: "@blueprintit.co.uk/rdf-datasource;1",
	ServiceName: "Improved RDF datasource",
	
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
		return this.instanceFactory;
	},

	canUnload: function(compMgr)
	{
		return true;
	},

	instanceFactory:
	{
		createInstance: function (outer, iid)
		{
			if (outer != null)
				throw Components.results.NS_ERROR_NO_AGGREGATION;
			return new nsRDFUtilDataSource().QueryInterface(iid);
		}
	}
}; //Module

function NSGetModule(compMgr, fileSpec)
{
	return initModule;
}
