function nsDeliciousBarService()
{
	this.NC_Name = this.rdfService.GetResource(this.NC+"Name");
	this.NC_URL = this.rdfService.GetResource(this.NC+"URL");
	this.NC_BookmarksRoot = this.rdfService.GetResource(this.NC+"BookmarksRoot");
	this.NC_Description = this.rdfService.GetResource(this.NC+"Description");
	this.NC_Bookmark = this.rdfService.GetResource(this.NC+"Bookmark");
	this.NC_Folder = this.rdfService.GetResource(this.NC+"Folder");
	this.WEB_Modified = this.rdfService.GetResource(this.WEB+"LastModifiedDate");
	this.RDF_Type = this.rdfService.GetResource(this.RDF+"type");
	this.DLC_Root = this.rdfService.GetResource(this.DLC+"Posts");
	this.DLC_Tags = this.rdfService.GetResource(this.DLC+"AllTags");
	this.DLBAR_AllTags = this.rdfService.GetResource(this.DLC+"AllTags");
	this.DLBAR_AnyTags = this.rdfService.GetResource(this.DLC+"AnyTags");
	this.DLBAR_NoneTags = this.rdfService.GetResource(this.DLC+"NoneTags");
}

nsDeliciousBarService.prototype =
{                         
	rdfService: Components.classes["@mozilla.org/rdf/rdf-service;1"].
                   	getService(Components.interfaces.nsIRDFService),
 	
	NC: "http://home.netscape.com/NC-rdf#",
	NC_Name: null,
	NC_URL: null,
	NC_BookmarksRoot: null,
	NC_Bookmark: null,
	NC_Description: null,
	NC_Folder: null,
	
	WEB: "http://home.netscape.com/WEB-rdf#",
	WEB_Modified: null,
	
	RDF: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
	RDF_Type: null,
	
	DLC: "http://del.icio.us#",
	DLC_Root: null,
	DLC_Tags: null,
	
	DLBAR: "http://www.blueprintit.co.uk/~dave/web/firefox/deliciousbar#";
	DLBAR_AllTags: null,
	DLBAR_AnyTags: null,
	DLBAR_NoneTags: null,
		
	ds: null,
	folderRoot: null,
	postRoot: null,
	allFolders: null,
	
	log: function(message)
	{
		console = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
		console.logStringMessage(message);
	},
	
	init: function()
	{
		//this.loadDataSource();
		//this.update();
	},
	
	loadDataSource: function()
	{
		if (this.ds!=null)
			return;
			
		var ioService = Components.classes["@mozilla.org/network/io-service;1"].
											getService(Components.interfaces.nsIIOService);
		var directoryService = Components.classes["@mozilla.org/file/directory_service;1"].
											getService(Components.interfaces.nsIProperties);
	
		var datafile = directoryService.get("ProfD",Components.interfaces.nsIFile);
		datafile.append("delicious.rdf");
		
		var data;
		this.ds = Components.classes["@blueprintit.co.uk/rdf-datasource;1"].
	                   	getService(Components.interfaces.nsIRDFUtilDataSource);
		data = this.rdfService.GetDataSourceBlocking(ioService.newFileURI(datafile).spec);
		this.ds.Init(data);
		
		this.ds.SetResourceTarget(this.NC_BookmarksRoot,this.RDF_Type,this.NC_Folder);
		this.folderRoot=this.ds.MakeSeq(this.NC_BookmarksRoot);
		this.postRoot=this.ds.MakeBag(this.DLC_Root);
		this.update();
	},
	
	hasTag: function(taglist,tag)
	{
		for (var i=0; i<taglist.length; i++)
		{
			if (tag==taglist[i])
			{
				return true;
			}
		}
		return false;
	},
	
	splitTags: function(text)
	{
		if ((text!=null)&&(text>0))
		{
			return foldertags.split(" ");
		}
		else
		{
			return [];
		}
	},
	
	countMatches: function(tags, bookmarktags)
	{
		var count=0;
		
		for (var i=0; i<tags.length; i++)
		{
			if (this.hasTag(bookmarktags,tags[i]))
			{
				count++;
			}
		}
		
		return count;
	},
	
	matches: function(folder,bookmark)
	{
		var alltags = this.splitTags(this.ds.GetStringTarget(folder,this.DLBAR_AllTags));
		var anytags = this.splitTags(this.ds.GetStringTarget(folder,this.DLBAR_AnyTags));
		var nonetags = this.splitTags(this.ds.GetStringTarget(folder,this.DLBAR_NoneTags));
		
		if ((alltags.length==0)&&(anytags.length==0)&&(nonetags.length==0))
		{
			return false;
		}
		
		var bookmarktags = this.splitTags(this.ds.GetStringTarget(folder,this.DLC_Tags));
		
		if (this.countMatches(alltags,bookmarktags)<alltags.length)
		{
			return false;
		}
		
		if (this.countMatches(nonetags,bookmarktags)>0)
		{
			return false;
		}
		
		if (anytags.length>0)
		{
			return this.countMatches(anytags,bookmarktags)>0;
		}
		else
		{
			return true;
		}
	},
	
	applyBookmark: function(folder,bookmark)
	{
		var match = this.matches(folder,bookmark);
		var exists=false;
		var seq = this.ds.MakeSeq(folder);
		var elements = seq.GetElements();
		while (elements.hasMoreElements())
		{
			var element = elements.getNext();
			if (this.ds.IsContainer(element))
			{
				this.applyBookmark(folder,bookmark);
			}
			else if (element==bookmark)
			{
				exists=true;
			}
		}
		if ((match)&&(!exists))
		{
			seq.AppendElement(bookmark);
		}
		else if ((!match)&&(exists))
		{
			seq.RemoveElement(bookmark);
		}
	},
	
	removeItem: function(folder,item)
	{
		var seq = this.ds.MakeSeq(folder);
		var elements = seq.GetElements();
		while (elements.hasMoreElements())
		{
			var element = elements.getNext();
			if (this.ds.IsContainer(element))
			{
				this.removeItem(element,item);
			}
		}
		if (seq.IndexOf(item)>=0)
		{
			seq.RemoveElement(item);
		}
	},
	
	emptyTree: function(item)
	{
		var seq = this.ds.MakeSeq(item);
		var elements = seq.GetElements();
		while (elements.hasMoreElements())
		{
			var element = elements.getNext();
			if (this.ds.IsContainer(element))
			{
				this.emptyTree(element);
			}
			seq.RemoveElement(element);
		}
	},
	
	deleteItem: function(item)
	{
		if (this.ds.IsContainer(item))
		{
			this.emptyTree(item);
		}
		this.removeItem(this.NC_BookmarksRoot,item);
		this.ds.DeleteResource(folder);
	},
	
	deliciousRead: function(url)
	{
		var baseurl="http://del.icio.us/api";
		var reader = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].
	                   createInstance(Components.interfaces.nsIXMLHttpRequest);
		reader.open("GET",baseurl+url,false,"mossop","78Cthulhu20");
		reader.send(null);
		return reader.responseXML.documentElement;
	},
	
	doUpdate: function()
	{
		this.ds.beginUpdateBatch();
		try
		{
			var posts = this.deliciousRead("/posts/all");
			if ((posts!=null)&&(posts.tagName=="posts"))
			{
				
				this.ds.SetStringTarget(this.NC_BookmarksRoot,this.NC_Name,posts.getAttribute("user")+"'s Bookmarks");
				this.ds.SetStringTarget(this.DLC_Root,this.WEB_Modified,posts.getAttribute("update"));
				
				var nodes = posts.getElementsByTagName("post");
				
				var bookmarks = [];
				
				var list = this.postRoot.GetElements();
				while (list.hasMoreElements())
				{
		  		bookmarks.push(list.getNext());
		  	}
		  	
		  	dump(bookmarks.length+" bookmarks already known\n");
		  	
				for (var i=0; i<nodes.length; i++)
				{
					var post = this.createBookmark(nodes[i].getAttribute("href"));
					var exists=false;
					for (var j=0; j<bookmarks.length; j++)
					{
						if (bookmarks[j]==post)
						{
							post=bookmarks[j];
							bookmarks[j]=null;
							exists=true;
							break;
						}
					}
					if (exists)
					{
						if (this.ds.GetStringTarget(post,this.WEB_Modified)==nodes[i].getAttribute("time"))
						{
							continue;
						}
						dump("Modified bookmark: "+post.Value+"\n");
					}
					else
					{
						dump("New bookmark: "+post.Value+"\n");
					}
					
					this.ds.SetStringTarget(post,this.NC_Name,nodes[i].getAttribute("description"));
					this.ds.SetStringTarget(post,this.WEB_Modified,nodes[i].getAttribute("time"));
					this.ds.SetStringTarget(post,this.NC_Description,nodes[i].getAttribute("extended"));
					this.ds.SetStringTarget(post,this.NC_URL,nodes[i].getAttribute("href"));
					this.ds.SetStringTarget(post,this.DLC_Tags,nodes[i].getAttribute("tag"));
					this.updateBookmark(post);
				}
				
				var deleted = this.postRoot.GetElements();
				for (var i=0; i<bookmarks.length; i++)
				{
					if (bookmarks[i]!=null)
					{
			  		dump("Deleted bookmark: "+bookmarks[i].Value+"\n");
			  		this.deleteBookmark(bookmarks[i]);
		  		}
		  	}
			}
		}
		catch (e)
		{
			this.log(e);
		}
		this.ds.endUpdateBatch();
		this.ds.Flush();
	},
		
	// Start of nsIDeliciousBar implementation	
	get datasource()
	{
		if (this.ds==null)
			this.loadDataSource();
		return this.ds;
	},
	
	createFolder: function(parent)
	{
		var newfolder = this.rdfService.GetAnonymousResource();
		this.ds.SetResourceTarget(newfolder,this.RDF_Type,this.NC_Folder);
		var seq = this.ds.MakeSeq(parent);
		this.ds.MakeSeq(newfolder);
		seq.AppendElement(newfolder);
		return newfolder;
	},
	
	updateFolder: function(folder)
	{
		var seq = this.ds.MakeSeq(folder);
		var posts = this.postRoot.GetElements();
		while (posts.hasMoreElements())
		{
			var bookmark=posts.getNext();
			var match = this.matches(folder,bookmark);
			var exists = seq.IndexOf(bookmark)>=0;
			if ((exists)&&(!match))
			{
				sql.RemoveElement(bookmark);
			}
			else if ((!exists)&&(match))
			{
				seq.AppendElement(bookmark);
			}
		}
		this.ds.Flush();
	},
	
	deleteFolder: function(folder)
	{
		this.deleteItem(folder);
		this.ds.Flush();
	},
	
	createBookmark: function(url)
	{
		var bookmark = this.rdfService.GetResource(url);
		if (this.postRoot.IndexOf(bookmark)<0)
		{
			this.ds.SetResourceTarget(bookmark,this.RDF_Type,this.NC_Bookmark);
			this.postRoot.AppendElement(bookmark);
		}
		return bookmark;
	},
	
	updateBookmark: function(bookmark)
	{
		this.applyBookmark(this.NC_BookmarksRoot,bookmark);
		this.ds.Flush();
	},
	
	deleteBookmark: function(bookmark)
	{
		this.deleteItem(bookmark);
		this.postRoot.RemoveElement(bookmark);
		this.ds.Flush();
	},
	
	cleanTree: function(seq)
	{
		while (seq.hasMoreElements())
		{
			var item = seq.getNext();
			if (this.ds.IsContainer(item))
			{
				this.cleanTree(this.ds.MakeSeq(item));
			}
			else
			{
				seq.RemoveElement(item);
				this.ds.DeleteResource(item);
			}
		}
	},
	
	clean: function()
	{
		this.ds.beginUpdateBatch();
		var posts = this.postRoot.GetElements();
		while (posts.hasMoreElements())
		{
			var bookmark=posts.getNext();
			this.ds.DeleteResource(bookmark);
			posts.RemoveElement(bookmark);
		}
		this.cleanTree(this.folderRoot);
		this.ds.endUpdateBatch();
		this.ds.Flush();
	},
	
	update: function()
	{
		this.doUpdate();
	},
	// End of nsIDeliciousBar implementation

	// Start of nsIObserver implementation
	observe: function(subject, topic, data)
	{
		if (topic == "app-startup")
		{
			dump("Delicious Bar startup\n");
			this.init();
		}
		else
		{
			dump(topic+" occured.\n");
		}
	},
	// End of nsIObserver implementation

	// Start of nsISupports implementation
	QueryInterface: function (iid)
	{
		if (iid.equals(Components.interfaces.nsIDeliciousBarService)
			|| iid.equals(Components.interfaces.nsISupports)
			|| iid.equals(Components.interfaces.nsIObserver))
		{
			return this;
		}
		else if (!iid.equals(Components.interfaces.nsIWeakReference)
			&& (!iid.equals(Components.interfaces.nsIClassInfo)))
		{
			dump("Service queried for unknown interface: "+iid+"\n");
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}
	}
	// End of nsISupports implementation
}

var initModule =
{
	ServiceCID: Components.ID("{2bc22847-ccb5-4a9a-a67a-83704fbc1f1e}"),
	ServiceContractID: "@blueprintit.co.uk/delicious-bar-service;1",
	ServiceName: "Delicious Bar Service",
	
	registerSelf: function (compMgr, fileSpec, location, type)
	{
		compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		compMgr.registerFactoryLocation(this.ServiceCID,this.ServiceName,this.ServiceContractID,
			fileSpec,location,type);

		var catman = Components.classes["@mozilla.org/categorymanager;1"].getService(Components.interfaces.nsICategoryManager);
		catman.addCategoryEntry("app-startup", "DeliciousBarService", this.ServiceContractID, true, true);
	},

	unregisterSelf: function (compMgr, fileSpec, location)
	{
		compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		compMgr.unregisterFactoryLocation(this.ServiceCID,fileSpec);

		var catman = Components.classes["@mozilla.org/categorymanager;1"].getService(Components.interfaces.nsICategoryManager);
		catman.deleteCategoryEntry("app-startup", this.ServiceContractID, true);
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
			if (iid.equals(Components.interfaces.nsIDeliciousBarService)
					|| iid.equals(Components.interfaces.nsISupports)
					|| iid.equals(Components.interfaces.nsIObserver))
			{
				if (this.service==null)
				{
					this.service=new nsDeliciousBarService();
				}
				return this.service.QueryInterface(iid);
			}
			else
			{
				dump("Factory queried unknown interface: "+iid+"\n");
				throw Components.results.NS_ERROR_NO_INTERFACE;
			}
		}
	}
}; //Module

function NSGetModule(compMgr, fileSpec)
{
	return initModule;
}
