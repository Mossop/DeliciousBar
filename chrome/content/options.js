/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

var updater =
{
	download: function()
	{
		var component = Components.classes["@blueprintit.co.uk/delicious-bar-service;1"].
	                   getService(Components.interfaces.nsIDeliciousBarService);
	  component.update();
	}
}
