/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

function nsOnlineBookmarksManager()
{
	this.resources = Components.classes["@blueprintit.co.uk/online-bookmarks-resources;1"].
                   	getService(Components.interfaces.nsIOBResources);
}

nsOnlineBookmarksManager.prototype =
{                         
	rdfService: Components.classes["@mozilla.org/rdf/rdf-service;1"].
                   	getService(Components.interfaces.nsIRDFService),

	preferences: Components.classes["@mozilla.org/preferences-service;1"].
                   	getService(Components.interfaces.nsIPrefService).getBranch("deliciousbar."),

	resources: null,
 	
	ds: null,
	folderRoot: null,
	postRoot: null,
	tagRoot: null,
	allFolders: null,
	observice: null,
	
	log: function(message)
	{
		console = Components.classes["@mozilla.org/consoleservice;1"].
									getService(Components.interfaces.nsIConsoleService);
		console.logStringMessage(message);
	},
	
	init: function()
	{
		if (this.ds!=null)
			return;
		dump("Delicious Bar startup\n");

		this.observice = Components.classes["@blueprintit.co.uk/delicious-service;1"].
									getService(Components.interfaces.nsIOnlineBookmarksService);
		
		var data = Components.classes["@mozilla.org/rdf/datasource;1?name=delicious"].
											getService(Components.interfaces.nsIRDFDataSource);
	
		this.ds = Components.classes["@blueprintit.co.uk/rdf-datasource;1"].
	                   	getService(Components.interfaces.nsIRDFUtilDataSource);
		this.ds.Init(data);
		
		this.ds.SetResourceTarget(this.resources.NC_BookmarksRoot,this.resources.RDF_Type,this.resources.NC_Folder);
		this.folderRoot=this.ds.MakeSeq(this.resources.NC_BookmarksRoot);
		this.postRoot=this.ds.MakeBag(this.resources.DLC_PostRoot);
		this.tagRoot=this.ds.MakeBag(this.resources.DLC_TagRoot);

		this.observice.init(this.QueryInterface(Components.interfaces.nsIOBCallback));		
	},
	
	countMatches: function(tags, bookmark)
	{
		var count=0;
		
		for (var i=0; i<tags.length; i++)
		{
			if (this.ds.HasAssertion(bookmark,this.resources.DLC_Tag,this.getTagFromName(tags[i]),true))
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
		var alltags = this.splitTags(this.ds.GetStringTarget(folder,this.resources.DLBAR_AllTags));
		var anytags = this.splitTags(this.ds.GetStringTarget(folder,this.resources.DLBAR_AnyTags));
		var nonetags = this.splitTags(this.ds.GetStringTarget(folder,this.resources.DLBAR_NoneTags));
		
		if ((alltags.length==0)&&(anytags.length==0)&&(nonetags.length==0))
		{
			return false;
		}
		
		if (this.countMatches(alltags,bookmark)<alltags.length)
		{
			return false;
		}
		
		if (this.countMatches(nonetags,bookmark)>0)
		{
			return false;
		}
		
		if (anytags.length>0)
		{
			return this.countMatches(anytags,bookmark)>0;
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
			seq.RemoveElement(bookmark,false);
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
		var container = Components.classes["@mozilla.org/rdf/container;1"].
		                  createInstance(Components.interfaces.nsIRDFContainer);
		container.Init(this.ds,item);
		var elements = container.GetElements();
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
		this.removeItem(this.resources.NC_BookmarksRoot,item);
		this.ds.DeleteResource(item);
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
	
	getTagFromName: function(tagname)
	{
		return this.rdfService.GetResource("http://del.icio.us/tags#"+tagname);
	},
	
	getNameFromTag: function(tag)
	{
		return this.ds.GetStringTarget(tag,this.resources.DLC_TagName);
	},
	
	setBookmarkIcon: function(bookmark,icon)
	{
		//dump("Setting icon for "+bookmark.Value+"\n");
		//dump(icon+"\n");
		this.ds.SetStringTarget(bookmark,this.resources.NC_Icon,icon);
		this.ds.Flush();
	},
	
	removeBookmarkIcon: function(bookmark)
	{
		//dump("Removing icon for "+bookmark.Value+"\n");
		this.ds.ClearTargets(bookmark,this.resources.NC_Icon);
		this.ds.Flush();
	},
	
	// Start of nsIDeliciousBar implementation	
	get datasource()
	{
		if (this.ds==null)
			this.init();
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
	
	createFolder: function(parent)
	{
		var newfolder = this.rdfService.GetAnonymousResource();
		this.ds.SetResourceTarget(newfolder,this.resources.RDF_Type,this.resources.NC_Folder);
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
			this.ds.SetResourceTarget(bookmark,this.resources.RDF_Type,this.resources.NC_Bookmark);
			this.postRoot.AppendElement(bookmark);
		}
		return bookmark;
	},
	
	updateBookmark: function(bookmark)
	{
		this.observice.storeBookmark(bookmark);
	},
	
	deleteBookmark: function(bookmark)
	{
		this.observice.deleteBookmark(bookmark);
	},
	
	setLocationIcon: function(location,favicon)
	{
		var bookmark = this.getBookmark(location);
		if (bookmark!=null)
		{
			if (favicon!=null)
			{
				//dump("Loading favicon - "+favicon+"\n");
				var listener = new deliciousIconLoader(this,bookmark,favicon);
			}
			else
			{
				//dump("Invalid favicon\n");
			}
		}
		else
		{
			//dump("Not a bookmark\n");
		}
	},
	
	getTags: function(bookmark)
	{
		var array = Components.classes["@mozilla.org/array;1"].
                   	getService(Components.interfaces.nsIMutableArray);
    var nodes = this.ds.GetTargets(bookmark,this.resources.DLC_Tag,true);
    while (nodes.hasMoreElements())
    {
    	array.appendElement(this.ds.GetStringTarget(nodes.getNext(),this.resources.DLC_TagName),false);
    }
    return array.enumerate();
	},
	
	getTagsAsString: function(bookmark)
	{
		var result="";
    var nodes = this.ds.GetTargets(bookmark,this.resources.DLC_Tag,true);
    while (nodes.hasMoreElements())
    {
    	result+=this.ds.GetStringTarget(nodes.getNext(),this.resources.DLC_TagName)+" ";
    }
    if (result.length>0)
    {
    	result=result.substring(0,result.length-1);
    }
    return result;
	},
	
	addTag: function(bookmark,tag)
	{
		var node = this.rdfService.GetLiteral(tag);
		var tagresource = this.getTagFromName(tag);
		tagresource = this.rdfService.GetResource("http://del.icio.us/tags#"+tag);
		if (this.tagRoot.IndexOf(tagresource)<0)
		{
			this.tagRoot.AppendElement(tagresource);
		}
		this.ds.SetStringTarget(tagresource,this.resources.DLC_TagName,tag);
		this.ds.SetResourceTarget(tagresource,this.resources.RDF_Type,this.resources.DLC_Tag);
		this.ds.Assert(bookmark,this.resources.DLC_Tag,tagresource,true);
	},
	
	removeTag: function(bookmark,tag)
	{
		var node = this.rdfService.GetLiteral(tag);
		var tagresource = this.getTagFromName(tag);
		this.ds.Unassert(bookmark,this.resources.DLC_Tag,tagresource,true);
	},
	
	setAllTags: function(bookmark,tags)
	{
		this.removeAllTags(bookmark);
		var taglist = tags.split(" ");
		for (var i=0; i<taglist.length; i++)
		{
			if (taglist[i].length>0)
				this.addTag(bookmark,taglist[i]);
		}
	},
	
	removeAllTags: function(bookmark)
	{
		this.ds.ClearTargets(bookmark,this.resources.DLC_Tag);
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
		this.observice.update();
	},
	// End of nsIDeliciousBar implementation

	// Start of nsIOBCallback implementation
	getBookmarks: function()
	{
		return this.postRoot.GetElements();
	},
	
	bookmarkUpdated: function(bookmark)
	{
		if (this.postRoot.IndexOf(bookmark)<0)
		{
			this.postRoot.AppendElement(bookmark);
		}
		this.applyBookmark(this.resources.NC_BookmarksRoot,bookmark);
		this.ds.Flush();
	},
	
	bookmarkDeleted: function(bookmark)
	{
		this.deleteItem(bookmark);
		this.postRoot.RemoveElement(bookmark,false);
		this.ds.Flush();
	},
	// End of nsIOBCallback implementation
	
	// Start of nsIObserver implementation
	observe: function(subject, topic, data)
	{
		if (topic=="app-startup")
		{
			//this.init();
		}
		else if (topic=="timer-callback")
		{
			if (subject==this.updateTimer)
			{
				this.doUpdate();
			}
			else if (subject==this.delayTimer)
			{
				this.delayComplete();
			}
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
		if (iid.equals(Components.interfaces.nsIOnlineBookmarksManager)
			|| iid.equals(Components.interfaces.nsIOBCallback)
			|| iid.equals(Components.interfaces.nsISupports)
			|| iid.equals(Components.interfaces.nsIObserver))
		{
			return this;
		}
		else if (!iid.equals(Components.interfaces.nsIWeakReference)
			&& (!iid.equals(Components.interfaces.nsIClassInfo))
			&& (!iid.equals(Components.interfaces.nsISecurityCheckedComponent)))
		{
			dump("DB Service queried for unknown interface: "+iid+"\n");
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}
		else
		{
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}
	}
	// End of nsISupports implementation
}

function deliciousIconLoader(service, bookmark, faviconurl)
{
  this.iosvc = Components.classes["@mozilla.org/network/io-service;1"].
  									getService(Components.interfaces.nsIIOService);
	this.service = service;
  this.bookmark = bookmark;
  this.mFavIconURL = faviconurl;
  this.mCountRead = 0;
  this.mChannel = this.iosvc.newChannel(faviconurl, null, null);
  //dump("Stream created\n");
  this.mChannel.notificationCallbacks = this;
  this.mChannel.asyncOpen(this, null);
  //dump("Stream opened\n");
}

deliciousIconLoader.prototype =
{
	service: null,
	iosvc: null,
  bookmark : null,
  mFavIconURL : null,
  mCountRead : null,
  mChannel : null,
  datastring :"",
  dataarray: Array(),
  mStream : null,

  QueryInterface: function (iid)
  {
    if (!iid.equals(Components.interfaces.nsISupports) &&
        !iid.equals(Components.interfaces.nsIInterfaceRequestor) &&
        !iid.equals(Components.interfaces.nsIRequestObserver) &&
        !iid.equals(Components.interfaces.nsIChannelEventSink) &&
        !iid.equals(Components.interfaces.nsIProgressEventSink) && // see below
        !iid.equals(Components.interfaces.nsIStreamListener) &&
        !iid.equals(Components.interfaces.nsIHttpEventSink))
    {
    	dump("Wanted interface "+iid+"\n");
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
    return this;
  },

  // nsIInterfaceRequestor
  getInterface: function (iid)
  {
    try
    {
      return this.QueryInterface(iid);
    }
    catch (e)
    {
      throw Components.results.NS_NOINTERFACE;
    }
  },

	// nsIHttpEventSink
	onRedirect: function(channel, newChannel)
	{
		if (this.mChannel==channel)
			this.mChannel=newChannel;
	},
	
  // nsIRequestObserver
  onStartRequest : function (aRequest, aContext)
  {
    this.mStream = Components.classes['@mozilla.org/binaryinputstream;1'].
    								createInstance(Components.interfaces.nsIBinaryInputStream);
  },

	encode64: function(input)
	{
		var keyStr = "ABCDEFGHIJKLMNOP" +
                "QRSTUVWXYZabcdef" +
                "ghijklmnopqrstuv" +
                "wxyz0123456789+/" +
                "=";
                
    var output = "";
    var chr1, chr2, chr3 = "";
    var enc1, enc2, enc3, enc4 = "";
    var i = 0;

    do
    {
       chr1 = input[i++];
       chr2 = input[i++];
       chr3 = input[i++];

       enc1 = chr1 >> 2;
       enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
       enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
       enc4 = chr3 & 63;

       if (isNaN(chr2))
       {
          enc3 = enc4 = 64;
       }
       else if (isNaN(chr3))
       {
          enc4 = 64;
       }

       output = output + 
          keyStr.charAt(enc1) + 
          keyStr.charAt(enc2) + 
          keyStr.charAt(enc3) + 
          keyStr.charAt(enc4);
       chr1 = chr2 = chr3 = "";
       enc1 = enc2 = enc3 = enc4 = "";
    } while (i < input.length);

    return output;
  },

  onStopRequest : function (aRequest, aContext, aStatusCode)
  {
  	//dump("Request stopped - "+this.mCountRead+" bytes read\n");
    var httpChannel = this.mChannel.QueryInterface(Components.interfaces.nsIHttpChannel);
    if ((httpChannel && httpChannel.requestSucceeded) &&
        Components.isSuccessCode(aStatusCode) &&
        this.mCountRead > 0)
    {
      var mimeType = null;
      // XXX - arbitrary size beyond which we won't store a favicon.  This is /extremely/
      // generous, and is probably too high.
      if (this.mCountRead <= 16384)
      {
        const nsICategoryManager = Components.interfaces.nsICategoryManager;
        const nsIContentSniffer = Components.interfaces.nsIContentSniffer;

        var catMgr = Components.classes["@mozilla.org/categorymanager;1"].getService(nsICategoryManager);
        var sniffers = catMgr.enumerateCategory("content-sniffing-services");
        while (mimeType == null && sniffers.hasMoreElements())
        {
          var snifferCID = sniffers.getNext().QueryInterface(Components.interfaces.nsISupportsCString).toString();
          var sniffer = Components.classes[snifferCID].getService(nsIContentSniffer);

          try
          {
            mimeType = sniffer.getMIMETypeFromContent(this.dataarray, this.mCountRead);
          }
          catch (e)
          {
            mimeType = null;
            // ignore
          }
        }
      }

      if (mimeType == null)
      {
        this.service.removeBookmarkIcon(this.bookmark);
      }
      else
      {
      	var iconData = this.encode64(this.dataarray);
        var dataUri = "data:"+mimeType+";base64,"+iconData;
        this.service.setBookmarkIcon(this.bookmark,dataUri);
      }
    }
    else
    {
    	//dump("Bad channel\n");
    }

    this.mChannel = null;
  },

  // nsIStreamObserver
  onDataAvailable : function (aRequest, aContext, aInputStream, aOffset, aCount)
  {
    // we could get a different aInputStream, so we don't save this;
    // it's unlikely we'll get more than one onDataAvailable for a
    // favicon anyway
    //dump(aCount+" bytes to read\n");
    this.mStream.setInputStream(aInputStream);

    var chunk = this.mStream.readByteArray(aCount);
    this.dataarray = this.dataarray.concat(chunk);
    this.mCountRead += aCount;
  },

  // nsIChannelEventSink
  onChannelRedirect : function (aOldChannel, aNewChannel, aFlags)
  {
    this.mChannel = aNewChannel;
  },

  // nsIProgressEventSink: the only reason we support
  // nsIProgressEventSink is to shut up a whole slew of xpconnect
  // warnings in debug builds.  (see bug #253127)
  onProgress : function (aRequest, aContext, aProgress, aProgressMax)
  {
  },
  
  onStatus : function (aRequest, aContext, aStatus, aStatusArg)
  {
  }
}

var initModule =
{
	ServiceCID: Components.ID("{2bc22847-ccb5-4a9a-a67a-83704fbc1f1e}"),
	ServiceContractID: "@blueprintit.co.uk/online-bookmarks-manager;1",
	ServiceName: "Online Bookmarks Manager",
	
	registerSelf: function (compMgr, fileSpec, location, type)
	{
		compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		compMgr.registerFactoryLocation(this.ServiceCID,this.ServiceName,this.ServiceContractID,
			fileSpec,location,type);

		var catman = Components.classes["@mozilla.org/categorymanager;1"].getService(Components.interfaces.nsICategoryManager);
		catman.addCategoryEntry("app-startup", "OBManager", this.ServiceContractID, true, true);
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
			if (this.service==null)
			{
				this.service=new nsOnlineBookmarksManager();
			}
			return this.service.QueryInterface(iid);
		}
	}
}; //Module

function NSGetModule(compMgr, fileSpec)
{
	return initModule;
}
