/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

function nsDeliciousService()
{
	this.resources = Components.classes["@blueprintit.co.uk/online-bookmarks-resources;1"].
                   	getService(Components.interfaces.nsIOBResources);
	this.manager = Components.classes["@blueprintit.co.uk/online-bookmarks-manager;1"].
                   	getService(Components.interfaces.nsIOnlineBookmarksManager);
}

nsDeliciousService.prototype =
{
	callback: null,
	datasource: null,
	manager: null,
	
	deliciousReady: true,
	updateTimer: Components.classes["@mozilla.org/timer;1"].
											createInstance(Components.interfaces.nsITimer),
	delayTimer: Components.classes["@mozilla.org/timer;1"].
	                   	createInstance(Components.interfaces.nsITimer),
	preferences: Components.classes["@mozilla.org/preferences-service;1"].
                   	getService(Components.interfaces.nsIPrefService).getBranch("deliciousbar."),
	resources: null,
	
	init: function(service)
	{
		this.callback=service;
		this.datasource=manager.datasource;

		var delay=this.preferences.getIntPref("initinterval");
		if (delay<5)
		{
			delay=5;
		}
		this.updateTimer.init(this,delay*1000,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
	},
	
	update: function()
	{
		this.updateTimer.cancel();
		this.doUpdate();
	},
	
	storeBookmark: function(bookmark)
	{
		var query = "url="+this.URLEncode(bookmark.Value);
		var also = this.datasource.GetStringTarget(bookmark,this.resources.NC_Name);
		if (also!=null)
		{
			query=query+"&description="+this.URLEncode(also);
		}
		also = this.datasource.GetStringTarget(bookmark,this.resources.NC_Description);
		if (also!=null)
		{
			query=query+"&extended="+this.URLEncode(also);
		}
		also = this.manager.getTagsAsString(bookmark);
		query=query+"&tags="+also;
		also=this.fromDate(new Date());
		this.datasource.SetStringTarget(bookmark,this.resources.WEB_Modified,this.URLEncode(also));
		query=query+"&dt="+also;
		dump(query+"\n");
		this.startRetries({ url: "/posts/add?"+query, service: this, callback: this.bookmarkUpdateComplete, bookmark: bookmark });
	},
	
	deleteBookmark: function(bookmark)
	{
		var query = "url="+this.URLEncode(bookmark.Value);
		this.startRetries({ url: "/posts/delete?"+query, service: this, callback: this.bookmarkDeleteComplete, bookmark: bookmark });
		return true;
	},
	
	bookmarkUpdateComplete: function(reader,args)
	{
		var result = args.document;
		if ((result!=null)&&(result.tagName=="result")&&(result.getAttribute("code")=="done"))
		{
			args.service.callback.bookmarkUpdated(args.bookmark);
		}
		else
		{
			alert("Failed to update bookmark. Please try again later.");
		}
	},
	
	bookmarkDeleteComplete: function(reader,args)
	{
		var result = args.document;
		if ((result!=null)&&(result.tagName=="result")&&(result.getAttribute("code")=="done"))
		{
			args.service.callback.bookmarkDeleted(args.bookmark);
		}
		else
		{
			alert("Failed to delete bookmark. Please try again later.");
		}
	},
	
	startRetries: function(args)
	{
		dump("Attempting to call "+args.url+"\n");
		if (args.retries==null)
		{
			args.retries=this.preferences.getIntPref("retries");
		}
		new deliciousLock(args.service,args.url,args.service.checkRetryStatus,args);
	},
	
	checkRetryStatus: function(reader,args)
	{
		dump(args.url+"\n");
		if (args.success)
		{
			dump("Success\n");
			args.callback(reader,args);
		}
		else
		{
			dump("Failed\n");
			args.retries=args.retries-1;
			if (args.retries>0)
			{
				args.service.startRetries(args);
			}
			else
			{
				dump("No more retries\n");
				args.callback(reader,args);
			}
		}
	},
	
	doUpdate: function()
	{
		dump("Starting update check.\n");
		new deliciousLock(this,"/posts/update",this.checkUpdates,{ service: this });
	},
	
	checkUpdates: function(reader,args)
	{
		var service = args.service;
		if (args.success)
		{
			var update = args.document;
			dump("Received update time.\n");
			if ((update.tagName=="update")&&(update.getAttribute("time")!=service.datasource.GetStringTarget(service.resources.DLC_PostRoot,service.resources.WEB_Modified)))
			{
				dump("Updates available.\n");
				new deliciousLock(service,"/posts/all",service.processUpdate,{service: service});
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
		else
		{
			dump("Update check failed\n");
			var delay=service.preferences.getIntPref("retryinterval");
			if (delay<5)
			{
				delay=5;
			}
			service.updateTimer.init(service,delay*1000,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
		}
	},
	
	deliciousRead: function(url, callback, args)
	{
		var service=args.service;
		var username=service.manager.username;
		if (username!=null)
		{
			var service=args.service;
			var interval=service.preferences.getIntPref("accessinterval");
			if (interval<1000)
			{
				interval=1000;
			}
			var baseurl=service.preferences.getCharPref("delicious.api");
			var reader = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].
		                   createInstance(Components.interfaces.nsIXMLHttpRequest);
			reader.open("GET",baseurl+url,callback!=null,username,service.manager.password);
			reader.overrideMimeType("text/xml");
			if (callback!=null)
			{
				reader.onreadystatechange = function()
				{
					if (reader.readyState==4)
  				{
	  				service.delayTimer.init(service,interval,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
						if (args!=null)
						{
							args.document=null;
							args.success=null;
							try
							{
								if ((reader.status)&&(reader.status==200))
								{
									args.document=reader.responseXML.documentElement;
									args.success=true;
								}
							}
							catch (e) {}
						}
	  				callback(reader,args);
					}
				};
			}
			reader.send(null);
			if (callback==null)
			{
		  	service.delayTimer.init(service,interval,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
				if (args!=null)
				{
					args.document=null;
					args.success=null;
					try
					{
						if ((reader.status)&&(reader.status==200))
						{
							args.document=reader.responseXML.documentElement;
							args.success=true;
						}
					}
					catch (e) {}
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
			service.datasource.beginUpdateBatch();
			try
			{				
				service.datasource.SetStringTarget(service.resources.NC_BookmarksRoot,service.resources.NC_Name,posts.getAttribute("user")+"'s Bookmarks");
				
				var nodes = posts.getElementsByTagName("post");
				
				var bookmarks = [];
				
				var list = service.manager.getBookmarks();
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
						service.ds.SetStringTarget(post,service.resources.NC_Name,nodes[i].getAttribute("description"));
					}
					if (nodes[i].hasAttribute("time"))
					{
						service.ds.SetStringTarget(post,service.resources.WEB_Modified,nodes[i].getAttribute("time"));
					}
					if (nodes[i].hasAttribute("extended"))
					{
						service.ds.SetStringTarget(post,service.resources.NC_Description,nodes[i].getAttribute("extended"));
					}
					if (nodes[i].hasAttribute("href"))
					{
						service.ds.SetStringTarget(post,service.resources.NC_URL,nodes[i].getAttribute("href"));
					}
					if (nodes[i].hasAttribute("tag"))
					{
						service.setAllTags(post,nodes[i].getAttribute("tag"));
					}
					service.callback.bookmarkUpdated(post);
				}

				for (var i=0; i<bookmarks.length; i++)
				{
					if (bookmarks[i]!=null)
					{
			  		dump("Deleted bookmark: "+bookmarks[i].Value+"\n");
			  		service.callback.bookmarkDeleted(bookmarks[i]);
		  		}
		  	}

				service.datasource.SetStringTarget(service.resources.DLC_PostRoot,service.resources.WEB_Modified,posts.getAttribute("update"));
			}
			catch (e)
			{
			}
			service.datasource.endUpdateBatch();
			service.datasource.Flush();
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

	// Start of nsIObserver implementation
	observe: function(subject, topic, data)
	{
		if (topic=="timer-callback")
		{
			if (subject==this.delayTimer)
			{
				this.deliciousReady=true;
			}
			else if (subject==this.updateTimer)
			{
				this.doUpdate();
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
		if (iid.equals(Components.interfaces.nsIOnlineBookmarksService)
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

function deliciousLock(service,url,callback,args)
{
	this.service=service;
	this.url=url;
	this.callback=callback;
	this.args=args;
	
	this.checkLock();
}

deliciousLock.prototype =
{
	service: null,
	url: null,
	callback: null,
	args: null,
	timer: Components.classes["@mozilla.org/timer;1"].
											createInstance(Components.interfaces.nsITimer),
	
	checkLock: function()
	{
		if (this.service.deliciousReady)
		{
			this.service.deliciousReady=false;
			dump("Calling delicious\n");
			this.service.deliciousRead(this.url,this.callback,this.args);
		}
		else
		{
			dump("Pausing...");
			this.timer.init(this,200,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
		}
	},
	
	observe: function(subject, topic, data)
	{
		if ((topic=="timer-callback")&&(subject==this.timer))
		{
			this.checkLock();
		}
	},
	
	QueryInterface: function(iid)
	{
		if (iid.equals(Components.interfaces.nsISupports)
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
	ServiceCID: Components.ID("{e1a4be1e-2530-4670-ab1d-d7b5c0d4e267}"),
	ServiceContractID: "@blueprintit.co.uk/delicious-service;1",
	ServiceName: "Delicious API Service",
	
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
				this.service=new nsDeliciousService();
			}
			return this.service.QueryInterface(iid);
		}
	}
}; //Module

function NSGetModule(compMgr, fileSpec)
{
	return initModule;
}
