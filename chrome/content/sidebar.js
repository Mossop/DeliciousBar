/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

sidebar = {
	
	init: function()
	{
		var dbservice = Components.classes["@blueprintit.co.uk/delicious-bar-service;1"].
	                   getService(Components.interfaces.nsIDeliciousBarService);
	  var taglist = document.getElementById("deliciousbar-tree-taglist");
	  taglist.database.AddDataSource(dbservice.datasource);
	  taglist.builder.rebuild();
	}
}
