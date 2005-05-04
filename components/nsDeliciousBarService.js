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
	this.NC_Icon = this.rdfService.GetResource(this.NC+"Icon");
	this.WEB_Modified = this.rdfService.GetResource(this.WEB+"LastModifiedDate");
	this.RDF_Type = this.rdfService.GetResource(this.RDF+"type");
	this.DLC_PostRoot = this.rdfService.GetResource(this.DLC+"Posts");
	this.DLC_TagRoot = this.rdfService.GetResource(this.DLC+"Tags");
	this.DLC_Tag = this.rdfService.GetResource(this.DLC+"Tag");
	this.DLC_TagName = this.rdfService.GetResource(this.DLC+"TagName");
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
		
	ds: null,
	folderRoot: null,
	postRoot: null,
	tagRoot: null,
	allFolders: null,
	deliciousReady: true,
	
	updateTimer: Components.classes["@mozilla.org/timer;1"].
											createInstance(Components.interfaces.nsITimer),
	delayTimer: Components.classes["@mozilla.org/timer;1"].
	                   	createInstance(Components.interfaces.nsITimer),
	
	log: function(message)
	{
		console = Components.classes["@mozilla.org/consoleservice;1"].
									getService(Components.interfaces.nsIConsoleService);
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
		this.postRoot=this.ds.MakeBag(this.DLC_PostRoot);
		this.tagRoot=this.ds.MakeBag(this.DLC_TagRoot);

		this.updateTimer.init(this,2000,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
	},
	
	doUpdate: function()
	{
		dump("Starting update check.\n");
		this.deliciousRead("/posts/update",this.checkUpdates,{ service: this });
	},
	
	checkUpdates: function(reader,args)
	{
		if (args.success)
		{
			var update = args.document;
			var service = args.service;
			dump("Received update time.\n");
			if ((update.tagName=="update")&&(update.getAttribute("time")!=service.ds.GetStringTarget(service.DLC_PostRoot,service.WEB_Modified)))
			{
				dump("Updates available.\n");
				service.deliciousRead("/posts/all",service.processUpdate,{service: service});
			}
			else
			{
				dump("No updates available.\n");
				var delay=service.preferences.getIntPref("updateinterval");
				if (delay<30)
				{
					delay=30;
				}
				service.updateTimer.init(service,delay*1000,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
			}
		}
	},
	
	countMatches: function(tags, bookmark)
	{
		var count=0;
		
		for (var i=0; i<tags.length; i++)
		{
			if (this.ds.HasAssertion(bookmark,this.DLC_Tag,this.getTagFromName(tags[i]),true))
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
	
	delayComplete: function()
	{
		this.deliciousReady=true;
		this.delayTimer.cancel();
	},
	
	deliciousRead: function(url, callback, args)
	{
		var username=this.username;
		if (username!=null)
		{
			if (!this.deliciousReady)
			{
				dump("Throttle back...");
				while (!this.deliciousReady)
				{
				}
				dump("complete.\n");
			}
			this.deliciousReady=false;
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
	  				service.delayTimer.init(service,1000,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
						if (args!=null)
						{
							if (reader.status==200)
							{
								args.document=reader.responseXML.documentElement;
								args.success=true;
							}
							else
							{
								args.document=null;
								args.success=false;
							}
						}
	  				callback(reader,args);
					}
				};
			}
			reader.send(null);
			if (callback==null)
			{
		  	service.delayTimer.init(service,1000,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
				if (args!=null)
				{
					if (reader.status==200)
					{
						args.document=reader.responseXML.documentElement;
						args.success=true;
					}
					else
					{
						args.document=null;
						args.success=false;
					}
				}
			}
			return reader;
		}
	},
	
	processUpdate: function(reader,args)
	{
		var posts = args.document;
		var service = args.service;
		if ((posts!=null)&&(posts.tagName=="posts"))
		{
			dump("Updating\n");
			service.ds.beginUpdateBatch();
			try
			{				
				service.ds.SetStringTarget(service.NC_BookmarksRoot,service.NC_Name,posts.getAttribute("user")+"'s Bookmarks");
				
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
					if (!exists)
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
						service.setAllTags(post,nodes[i].getAttribute("tag"));
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

				service.ds.SetStringTarget(service.DLC_PostRoot,service.WEB_Modified,posts.getAttribute("update"));
			}
			catch (e)
			{
				service.log(e);
			}
			service.ds.endUpdateBatch();
			service.ds.Flush();
		}
		else
		{
			if (posts==null)
			{
				dump("posts was null\n");
			}
			else
			{
				dump("posts was a "+posts.tagName+"\n");
			}
		}
		var update=service.preferences.getIntPref("updateinterval");
		if (update<30)
		{
			update=30;
		}
		service.updateTimer.init(service,update*1000,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
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
	
	getTagFromName: function(tagname)
	{
		return this.rdfService.GetResource("http://del.icio.us/tags#"+tagname);
	},
	
	getNameFromTag: function(tag)
	{
		return this.ds.GetStringTarget(tag,this.DLC_TagName);
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
	
	setBookmarkIcon: function(bookmark,icon)
	{
		//dump("Setting icon for "+bookmark.Value+"\n");
		//dump(icon+"\n");
		this.ds.SetStringTarget(bookmark,this.NC_Icon,icon);
		this.ds.Flush();
	},
	
	removeBookmarkIcon: function(bookmark)
	{
		//dump("Removing icon for "+bookmark.Value+"\n");
		this.ds.ClearTargets(bookmark,this.NC_Icon);
		this.ds.Flush();
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
		also = this.getTagsAsString(bookmark);
		query=query+"&tags="+also;
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
    var nodes = this.ds.GetTargets(bookmark,this.DLC_Tag,true);
    while (nodes.hasMoreElements())
    {
    	array.appendElement(this.ds.GetStringTarget(nodes.getNext(),this.DLC_TagName),false);
    }
    return array.enumerate();
	},
	
	getTagsAsString: function(bookmark)
	{
		var result="";
    var nodes = this.ds.GetTargets(bookmark,this.DLC_Tag,true);
    while (nodes.hasMoreElements())
    {
    	result+=this.ds.GetStringTarget(nodes.getNext(),this.DLC_TagName)+" ";
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
		this.ds.SetStringTarget(tagresource,this.DLC_TagName,tag);
		this.ds.SetResourceTarget(tagresource,this.RDF_Type,this.DLC_Tag);
		this.ds.Assert(bookmark,this.DLC_Tag,tagresource,true);
	},
	
	removeTag: function(bookmark,tag)
	{
		var node = this.rdfService.GetLiteral(tag);
		var tagresource = this.getTagFromName(tag);
		this.ds.Unassert(bookmark,this.DLC_Tag,tagresource,true);
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
		this.ds.ClearTargets(bookmark,this.DLC_Tag);
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
		this.updateTimer.cancel();
		this.doUpdate();
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
		if (topic=="app-startup")
		{
			this.init();
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
		if (iid.equals(Components.interfaces.nsIDeliciousBarService)
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
