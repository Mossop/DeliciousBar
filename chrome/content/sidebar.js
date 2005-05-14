/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

sidebar = {
	
	conditions: null,
	bookmarklist: null,
	
	init: function()
	{
		var dbservice = Components.classes["@blueprintit.co.uk/online-bookmarks-manager;1"].
	                   getService(Components.interfaces.nsIOnlineBookmarksManager);
	                   
	  var rule = document.getElementById("bookmark-rule");
	  sidebar.conditions = rule.firstChild;
	  
	  var taglist = document.getElementById("deliciousbar-list-taglist");
	  //taglist.database.AddDataSource(dbservice.datasource);
	  //taglist.builder.rebuild();
	  taglist.addEventListener("CheckboxStateChange",sidebar.checkboxChange,false);
	  sidebar.bookmarklist = document.getElementById("deliciousbar-list-bookmarklist");
	  //sidebar.bookmarklist.database.AddDataSource(dbservice.datasource);
	  //sidebar.bookmarklist.builder.rebuild();
	},
	
	checkboxChange: function(event)
	{
		var checkbox = event.target;
		if (checkbox.checked)
		{
			var node = document.createElement("triple");
			node.setAttribute("subject","?bookmark");
			node.setAttribute("predicate","http://del.icio.us#Tag");
			node.setAttribute("object",checkbox.id);
			sidebar.conditions.appendChild(node);
		}
		else
		{
			var nodes = sidebar.conditions.getElementsByTagName("triple");
			for (var i=0; i<nodes.length; i++)
			{
				if (nodes[i].getAttribute("object")==checkbox.id)
				{
					sidebar.conditions.removeChild(nodes[i]);
				}
			}
		}
	  sidebar.bookmarklist.builder.rebuild();
	},
	
	bookmarkClick: function(event)
	{
		if (event.button!=1)
			return;
		openUILink(event.target.id,event,false,false);
	},
	
	bookmarkDoubleClick: function(event)
	{
		openUILink(event.target.id,event,false,false);
	}
}
