/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

var options =
{
	dbservice: Components.classes["@blueprintit.co.uk/delicious-bar-service;1"].
	                   getService(Components.interfaces.nsIDeliciousBarService),
	                   
	init: function()
	{
		var input = document.getElementById("username");
		input.value=options.dbservice.username;
		input=document.getElementById("password");
		input.value=options.dbservice.password;
	},
	
	apply: function()
	{
		var input = document.getElementById("username");
		options.dbservice.username=input.value;
		input=document.getElementById("password");
		options.dbservice.password=input.value;
		return true;
	},
	
	download: function()
	{
		var component = Components.classes["@blueprintit.co.uk/delicious-bar-service;1"].
	                   getService(Components.interfaces.nsIDeliciousBarService);
	  component.update();
	},
	
	clean: function()
	{
		var component = Components.classes["@blueprintit.co.uk/delicious-bar-service;1"].
	                   getService(Components.interfaces.nsIDeliciousBarService);
	  component.clean();
	}
}

window.addEventListener("load",options.init,false);
