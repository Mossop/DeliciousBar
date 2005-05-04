bookmarks = {
	click: function(event)
	{
		openUILink(event.target.id,event,false,false);
	},
	
	middleClick: function(event)
	{
		if (event.button!=1)
			return;
		openUILink(event.target.id,event,false,false);
	}
}
