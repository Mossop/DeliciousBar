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
		var dbservice = Components.classes["@blueprintit.co.uk/delicious-bar-service;1"].
	                   getService(Components.interfaces.nsIDeliciousBarService);
	                   
	  var rule = document.getElementById("bookmark-rule");
	  sidebar.conditions = rule.firstChild;
	  
	  var taglist = document.getElementById("deliciousbar-tree-taglist");
	  taglist.database.AddDataSource(dbservice.datasource);
	  taglist.builder.rebuild();
	  sidebar.bookmarklist = document.getElementById("deliciousbar-tree-bookmarklist");
	  sidebar.bookmarklist.database.AddDataSource(dbservice.datasource);
	  sidebar.bookmarklist.builder.rebuild();
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
	}
}
