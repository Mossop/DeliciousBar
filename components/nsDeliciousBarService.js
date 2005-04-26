/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

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
	this.DLC_Tags = this.rdfService.GetResource(this.DLC+"Tags");
	this.DLBAR_AllTags = this.rdfService.GetResource(this.DLBAR+"AllTags");
	this.DLBAR_AnyTags = this.rdfService.GetResource(this.DLBAR+"AnyTags");
	this.DLBAR_NoneTags = this.rdfService.GetResource(this.DLBAR+"NoneTags");
}

nsDeliciousBarService.prototype =
{                         
	rdfService: Components.classes["@mozilla.org/rdf/rdf-service;1"].
                   	getService(Components.interfaces.nsIRDFService),

	preferences: Components.classes["@mozilla.org/preferences-service;1"].
                   	getService(Components.interfaces.nsIPrefService).getBranch("deliciousbar."),
 	
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
	
	DLBAR: "http://www.blueprintit.co.uk/~dave/web/firefox/deliciousbar#",
	DLBAR_AllTags: null,
	DLBAR_AnyTags: null,
	DLBAR_NoneTags: null,
		
	ds: null,
	folderRoot: null,
	postRoot: null,
	allFolders: null,
	deliciousReady: true,
	
	window: null,
	
	log: function(message)
	{
		console = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
		console.logStringMessage(message);
	},
	
	init: function()
	{
		dump("Delicious Bar startup\n");
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
	
	splitTags: function(text)
	{
		if ((text!=null)&&(text.length>0))
		{
			return text.split(" ");
		}
		else
		{
			return [];
		}
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
		
		var bookmarktags = this.splitTags(this.ds.GetStringTarget(bookmark,this.DLC_Tags));
		
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
				this.applyBookmark(element,bookmark);
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
			seq.RemoveElement(item,false);
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
			seq.RemoveElement(element,false);
		}
	},
	
	deleteItem: function(item)
	{
		if (this.ds.IsContainer(item))
		{
			this.emptyTree(item);
		}
		this.removeItem(this.NC_BookmarksRoot,item);
		this.ds.DeleteResource(item);
	},
	
	delayComplete: function(service)
	{
		service.deliciousReady=true;
	},
	
	deliciousRead: function(url, object, callback)
	{
		var username=this.username;
		if (username!=null)
		{
			while (!this.deliciousReady)
			{
			}
			if (this.window!=null)
			{
				this.deliciousReady=false;
			}
			var service=this;
			var baseurl=this.preferences.getCharPref("delicious.api");
			var reader = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].
		                   createInstance(Components.interfaces.nsIXMLHttpRequest);
			reader.open("GET",baseurl+url,callback!=null,this.username,this.password);
			reader.overrideMimeType("text/xml");
			if (callback!=null)
			{
				reader.onreadystatechange = function()
					{
						if (reader.readyState==4)
	  				{
	  					if (service.window!=null)
	  					{
		  					service.window.setTimeout(service.delayComplete,2000,service);
		  				}
	  					if (reader.status==200)
	  					{
	  						callback(object,reader.responseXML.documentElement,reader.status,reader.statusText);
	  					}
	  					else
	  					{
								dump("Unable to access delicious: "+reader.status+" "+reader.statusText+"\n");
	  						callback(object,null,reader.status,reader.statusText);
	  					}
						}
					};
			}
			reader.send(null);
			if (callback==null)
			{
				if (reader.status==200)
				{
					return reader.responseXML.documentElement;
				}
				else
				{
					dump("Unable to access delicious: "+reader.status+" "+reader.statusText+"\n");
					return null;
				}
			}
		}
	},
	
	processUpdate: function(service,posts,status,statusText)
	{
		if ((posts!=null)&&(posts.tagName=="posts"))
		{
			service.ds.beginUpdateBatch();
			try
			{				
				service.ds.SetStringTarget(service.NC_BookmarksRoot,service.NC_Name,posts.getAttribute("user")+"'s Bookmarks");
				service.ds.SetStringTarget(service.DLC_Root,service.WEB_Modified,posts.getAttribute("update"));
				
				var nodes = posts.getElementsByTagName("post");
				
				var bookmarks = [];
				
				var list = service.postRoot.GetElements();
				while (list.hasMoreElements())
				{
		  		bookmarks.push(list.getNext());
		  	}
		  	
		  	dump(bookmarks.length+" bookmarks already known\n");
		  	
				for (var i=0; i<nodes.length; i++)
				{
					var post = service.createBookmark(nodes[i].getAttribute("href"));
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
						if (service.ds.GetStringTarget(post,service.WEB_Modified)==nodes[i].getAttribute("time"))
						{
							continue;
						}
						dump("Modified bookmark: "+post.Value+"\n");
					}
					else
					{
						dump("New bookmark: "+post.Value+"\n");
					}
					
					if (nodes[i].hasAttribute("description"))
					{
						service.ds.SetStringTarget(post,service.NC_Name,nodes[i].getAttribute("description"));
					}
					if (nodes[i].hasAttribute("time"))
					{
						service.ds.SetStringTarget(post,service.WEB_Modified,nodes[i].getAttribute("time"));
					}
					if (nodes[i].hasAttribute("extended"))
					{
						service.ds.SetStringTarget(post,service.NC_Description,nodes[i].getAttribute("extended"));
					}
					if (nodes[i].hasAttribute("href"))
					{
						service.ds.SetStringTarget(post,service.NC_URL,nodes[i].getAttribute("href"));
					}
					if (nodes[i].hasAttribute("tag"))
					{
						service.ds.SetStringTarget(post,service.DLC_Tags,nodes[i].getAttribute("tag"));
					}
					service.bookmarkUpdated(post);
				}
				
				var deleted = service.postRoot.GetElements();
				for (var i=0; i<bookmarks.length; i++)
				{
					if (bookmarks[i]!=null)
					{
			  		dump("Deleted bookmark: "+bookmarks[i].Value+"\n");
			  		service.bookmarkDeleted(bookmarks[i]);
		  		}
		  	}
			}
			catch (e)
			{
				service.log(e);
			}
			service.ds.endUpdateBatch();
			service.ds.Flush();
		}
	},
	
	folderUpdated: function(folder)
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
				seq.RemoveElement(bookmark,false);
			}
			else if ((!exists)&&(match))
			{
				seq.AppendElement(bookmark,false);
			}
		}
		this.ds.Flush();
	},
	
	folderDeleted: function(folder)
	{
		this.deleteItem(folder);
		this.ds.Flush();
	},
	
	bookmarkUpdated: function(bookmark)
	{
		this.applyBookmark(this.NC_BookmarksRoot,bookmark);
		this.ds.Flush();
	},
	
	bookmarkDeleted: function(bookmark)
	{
		this.deleteItem(bookmark);
		this.postRoot.RemoveElement(bookmark,false);
		this.ds.Flush();
	},
	
	padNumber: function(number,length)
	{
		var text = number+"";
		while (text.length<length)
		{
			text="0"+text;
		}
		return text;
	},
	
	toDate: function()
	{
		return new Date();
	},
	
	fromDate: function(date)
	{
		var text = date.getFullYear();
		text+="-";
		text+=this.padNumber(date.getMonth()+1,2);
		text+="-";
		text+=this.padNumber(date.getDate(),2);
		text+="T";
		text+=this.padNumber(date.getHours(),2);
		text+=":";
		text+=this.padNumber(date.getMinutes(),2);
		text+=":";
		text+=this.padNumber(date.getSeconds(),2);
		text+="Z";
		return text;
	},
	
	// Start of nsIDeliciousBar implementation	
	get datasource()
	{
		if (this.ds==null)
			this.loadDataSource();
		return this.ds;
	},
	
	get username()
	{
		if (this.preferences.prefHasUserValue("username"))
		{
			return this.preferences.getCharPref("username");
		}
		else
		{
			return null;
		}
	},
	
	set username(value)
	{
		this.preferences.setCharPref("username",value);
	},
	
	get password()
	{
		var passwordHost = this.preferences.getCharPref("passwordhost");
		var user = this.username;
		if (user!=null)
		{
	  	var pm = Components.classes["@mozilla.org/passwordmanager;1"].
	  								getService(Components.interfaces.nsIPasswordManager);
	    var passwords = pm.enumerator;
	   	while (passwords.hasMoreElements())
	   	{
	    	var password = passwords.getNext();
	    	password = password.QueryInterface(Components.interfaces.nsIPassword);
	      if ((password.host==passwordHost)&&(password.user==user))
	      {
		      return password.password;
	      }
	    }
	    return null;
	  }
	  else
	  {
	  	return null;
	  }
	},
	
	set password(value)
	{
  	var pm = Components.classes["@mozilla.org/passwordmanager;1"].
  								getService(Components.interfaces.nsIPasswordManager);
  	pm.addUser(this.preferences.getCharPref("passwordhost"),this.username,value);
	},
	
	setWindow: function(window)
	{
		if (this.window==null)
		{
			this.window=window;
		}
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
		this.folderUpdated(folder);
	},
	
	deleteFolder: function(folder)
	{
		this.folderDeleted(folder);
	},
	
	getBookmark: function(url)
	{
		var bookmark = this.rdfService.GetResource(url);
		if (this.postRoot.IndexOf(bookmark)<0)
		{
			return null;
		}
		return bookmark;
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
		var query = "url="+this.URLEncode(bookmark.Value);
		var also = this.ds.GetStringTarget(bookmark,this.NC_Name);
		if (also!=null)
		{
			query=query+"&description="+this.URLEncode(also);
		}
		also = this.ds.GetStringTarget(bookmark,this.NC_Description);
		if (also!=null)
		{
			query=query+"&extended="+this.URLEncode(also);
		}
		also = this.ds.GetStringTarget(bookmark,this.DLC_Tags);
		if (also!=null)
		{
			query=query+"&tags="+this.URLEncode(also);
		}
		else
		{
			query=query+"&tags=";
		}
		also=this.fromDate(new Date());
		this.ds.SetStringTarget(bookmark,this.WEB_Modified,this.URLEncode(also));
		query=query+"&dt="+also;
		dump(query+"\n");
		var result = this.deliciousRead("/posts/add?"+query);
		if ((result!=null)&&(result.tagName=="result")&&(result.getAttribute("code")=="done"))
		{
			this.bookmarkUpdated(bookmark);
			return true;
		}
		else
		{
			return false;
		}
	},
	
	deleteBookmark: function(bookmark)
	{
		var query = "url="+this.URLEncode(bookmark.Value);
		dump(query+"\n");
		var result = this.deliciousRead("/posts/delete?"+query);
		if ((result!=null)&&(result.tagName=="result")&&(result.getAttribute("code")=="done"))
		{
			this.bookmarkDeleted(bookmark);
			return true;
		}
		else
		{
			return false;
		}
	},
	
	cleanTree: function(seq)
	{
		var elements = seq.GetElements();
		while (elements.hasMoreElements())
		{
			var item = elements.getNext();
			if (this.ds.IsContainer(item))
			{
				this.cleanTree(this.ds.MakeSeq(item));
			}
			else
			{
				seq.RemoveElement(item,false);
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
			this.postRoot.RemoveElement(bookmark,false);
		}
		this.cleanTree(this.folderRoot);
		this.ds.endUpdateBatch();
		this.ds.Flush();
	},
	
	update: function()
	{
		this.deliciousRead("/posts/all",this,this.processUpdate);
	},
	
	URLEncode: function(plaintext)
	{
		// The Javascript escape and unescape functions do not correspond
		// with what browsers actually do...
		var SAFECHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_.!~*'()";
		var HEX = "0123456789ABCDEF";
	
		var encoded = "";
		for (var i=0; i<plaintext.length; i++)
		{
			var ch = plaintext.charAt(i);
		  if (ch==" ")
		  {
			  encoded+="+";				// x-www-urlencoded, rather than %20
			}
			else if (SAFECHARS.indexOf(ch) != -1)
			{
			  encoded+=ch;
			}
			else
			{
			  var charCode=ch.charCodeAt(0);
				if (charCode>255)
				{
					encoded+="+";
				}
				else
				{
					encoded+="%";
					encoded+=HEX.charAt((charCode >> 4) & 0xF);
					encoded+=HEX.charAt(charCode & 0xF);
				}
			}
		}
		return encoded;
	},
	
	URLDecode: function(encoded)
	{
	  var HEXCHARS = "0123456789ABCDEFabcdef"; 
	  var plaintext = "";
	   
	  var i = 0;
	  while (i<encoded.length)
	  {
	    var ch = encoded.charAt(i);
		  if (ch=="+")
		  {
		    plaintext+=" ";
			  i++;
		  }
		  else if (ch=="%")
		  {
				if ((i<(encoded.length-2))
						&&(HEXCHARS.indexOf(encoded.charAt(i+1))!=-1)
						&&(HEXCHARS.indexOf(encoded.charAt(i+2))!=-1))
				{
					plaintext+=unescape(encoded.substr(i,3));
					i += 3;
				}
				else
				{
					plaintext += "%[ERROR]";
					i++;
				}
			}
			else
			{
			  plaintext += ch;
			  i++;
			}
		}

	  return plaintext;
	},
	// End of nsIDeliciousBar implementation

	// Start of nsIObserver implementation
	observe: function(subject, topic, data)
	{
		if (topic == "app-startup")
		{
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
