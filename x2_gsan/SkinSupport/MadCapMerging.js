/// <reference path="MadCapUtilities.js" />

// {{MadCap}} //////////////////////////////////////////////////////////////////
// Copyright: MadCap Software, Inc - www.madcapsoftware.com ////////////////////
////////////////////////////////////////////////////////////////////////////////
// <version>6.1.0.0</version>
////////////////////////////////////////////////////////////////////////////////

var gHelpSystem = null;

function FMCGetHelpSystem()
{
	if ( !gHelpSystem )
	{
		var pathToHelpSystem = FMCGetAttribute( document.documentElement, "MadCap:PathToHelpSystem" );
		
		if ( pathToHelpSystem == null )
		{
			pathToHelpSystem = "";
		}
		
		var hsFileName = FMCGetAttribute( document.documentElement, "MadCap:HelpSystemFileName" );
		var currentFolder = new CMCUrl( FMCEscapeHref( document.location.href ) ).ToFolder();
		var absPathToHS = currentFolder.CombinePath( pathToHelpSystem );
		var hsUrl = absPathToHS.AddFile( hsFileName );

		gHelpSystem = new CMCHelpSystem( null, absPathToHS.FullPath, hsUrl.FullPath, null, null );
	}
	
	return gHelpSystem;
}

/* -CatapultCompiler- -Begin- -Copy to CSH Javascript- */

//
//    Class CMCHelpSystem
//

function CMCHelpSystem( parentSubsystem, parentPath, xmlFile, tocPath, browseSequencePath )
{
	// Private member variables

	var mSelf				= this;
	var mParentSubsystem	= parentSubsystem;
	var mPath				= parentPath;
	var mXmlFile			= xmlFile;
	var mSubsystems			= new Array();
	var mTocPath			= tocPath;
	var mBrowseSequencePath	= browseSequencePath;
	var mConceptMap			= null;
	var mViewedConceptMap	= new CMCDictionary();
	var mExists				= false;
	var mAliasFile			= new CMCAliasFile( parentPath + "Data/Alias.xml", this );
	var mTocFile			= new CMCTocFile( this, EMCTocType.Toc );
	var mBrowseSequenceFile	= new CMCTocFile( this, EMCTocType.BrowseSequence );

	// Public properties

	this.TargetType						= null;
	this.SkinFolder						= null;
	this.SkinTemplateFolder				= null;
	this.DefaultStartTopic				= null;
	this.InPreviewMode					= null;
	this.LiveHelpOutputId				= null;
	this.LiveHelpServer					= null;
	this.LiveHelpEnabled				= false;
	this.IsWebHelpPlus					= false;
	this.ContentFolder					= null;
	this.UseCustomTopicFileExtension	= false;
	this.CustomTopicFileExtension		= null;
	this.PreloadImages					= false;
	
	this.GlossaryUrl					= null;

	// Constructor

	(function()
	{
		var xmlDoc	= CMCXmlParser.GetXmlDoc( xmlFile, false, null, null );
	    
		mExists = xmlDoc != null;
	    
		if ( !mExists )
		{
			return;
		}

		if ( xmlDoc.getElementsByTagName( "Subsystems" ).length > 0 )
		{
			var urlNodes    = xmlDoc.getElementsByTagName( "Subsystems" )[0].getElementsByTagName( "Url" );
	        
			for ( var i = 0; i < urlNodes.length; i++ )
			{
				var urlNode	= urlNodes[i];
				var url		= urlNode.getAttribute( "Source" );
				var subPath	= url.substring( 0, url.lastIndexOf( "/" ) + 1 );
				var tocPath	= urlNode.getAttribute( "TocPath" );
				var browseSequencePath = urlNode.getAttribute( "BrowseSequencePath" );
	            
				mSubsystems.push( new CMCHelpSystem( mSelf, mPath + subPath, mPath + url.substring( 0, url.lastIndexOf( "." ) ) + ".xml", tocPath, browseSequencePath ) );
			}
		}
		
		mSelf.TargetType = xmlDoc.documentElement.getAttribute( "TargetType" );
		mSelf.SkinFolder = new CMCUrl( xmlDoc.documentElement.getAttribute( "Skin" ) ).ToFolder().FullPath;
		mSelf.SkinTemplateFolder = xmlDoc.documentElement.getAttribute( "SkinTemplateFolder" );
		mSelf.DefaultStartTopic = xmlDoc.documentElement.getAttribute( "DefaultUrl" );
		mSelf.InPreviewMode = FMCGetAttributeBool( xmlDoc.documentElement, "InPreviewMode", false );
		mSelf.LiveHelpOutputId = xmlDoc.documentElement.getAttribute( "LiveHelpOutputId" );
		mSelf.LiveHelpServer = xmlDoc.documentElement.getAttribute( "LiveHelpServer" );
		mSelf.LiveHelpEnabled = mSelf.LiveHelpOutputId != null;
		mSelf.IsWebHelpPlus = mSelf.TargetType == "WebHelpPlus" && document.location.protocol.StartsWith( "http", false );
		
		var moveOutputContentToRoot	= FMCGetAttributeBool( xmlDoc.documentElement, "MoveOutputContentToRoot", false );
		var makeFileLowerCase		= FMCGetAttributeBool( xmlDoc.documentElement, "MakeFileLowerCase", false );
		var contentFolder			= "";
		
		if ( !moveOutputContentToRoot )
		{
			contentFolder = "Content/";
		}
		
		if ( makeFileLowerCase )
		{
			contentFolder = contentFolder.toLowerCase();
		}
		
		mSelf.ContentFolder = contentFolder;
		mSelf.UseCustomTopicFileExtension = FMCGetAttributeBool( xmlDoc.documentElement, "UseCustomTopicFileExtension", false );
		mSelf.CustomTopicFileExtension = FMCGetAttribute( xmlDoc.documentElement, "CustomTopicFileExtension" );
		mSelf.PreloadImages = FMCGetAttributeBool( xmlDoc.documentElement, "PreloadImages", false );

		mSelf.GlossaryUrl = GetGlossaryUrl( xmlDoc );
	})();

	// Public member functions
    
	this.GetExists      = function()
	{
		return mExists;
	};
    
	this.GetParentSubsystem = function()
	{
		return mParentSubsystem;
	};
    
	this.GetPath        = function()
	{
		return mPath;
	};
    
	this.GetTocPath     = function( tocType )
	{
		return tocType == "toc" ? mTocPath : mBrowseSequencePath;
	};
	
	this.GetFullTocPath = function( tocType, href )
	{
		var subsystem = this.GetHelpSystem( href );
		var fullTocPath = new Object();

		fullTocPath.tocPath = this.GetTocPath( tocType );
		subsystem.ComputeTocPath( tocType, fullTocPath );
		
		return fullTocPath.tocPath;
	};
    
	this.ComputeTocPath = function( tocType, tocPath )
	{
		if ( mParentSubsystem )
		{
			var hsTocPath = this.GetTocPath( tocType );
			
			if ( !String.IsNullOrEmpty( hsTocPath ) )
			{
				tocPath.tocPath = tocPath.tocPath ? hsTocPath + "|" + tocPath.tocPath : hsTocPath;
			}
			
			mParentSubsystem.ComputeTocPath( tocType, tocPath );
		}
	};
    
	this.GetHelpSystem  = function( path )
	{
		var helpSystem	= null;
	    
		for ( var i = 0; i < mSubsystems.length; i++ )
		{
			helpSystem = mSubsystems[i].GetHelpSystem( path );
	        
			if ( helpSystem != null )
			{
				return helpSystem;
			}
		}
		
		if ( path.StartsWith( mPath, false ) )
		{
			return this;
		}
	    
		return null;
	};
    
	this.GetSubsystem   = function( id )
	{
		return mSubsystems[id];
	};
	
	this.GetMergedAliasIDs	= function()
	{
		var ids	= mAliasFile.GetIDs();
		
		for ( var i = 0, length = mSubsystems.length; i < length; i++ )
		{
			var subsystem	= mSubsystems[i];
			var subIDs		= subsystem.GetMergedAliasIDs();
			
			for ( var j = 0, length2 = subIDs.length; j < length2; j++ )
			{
				ids[ids.length] = subIDs[j];
			}
		}
		
		return ids;
	};
	
	this.GetMergedAliasNames	= function()
	{
		var names	= mAliasFile.GetNames();
		
		for ( var i = 0, length = mSubsystems.length; i < length; i++ )
		{
			var subsystem	= mSubsystems[i];
			var subNames	= subsystem.GetMergedAliasNames();
			
			for ( var j = 0, length2 = subNames.length; j < length2; j++ )
			{
				names[names.length] = subNames[j];
			}
		}
		
		return names;
	};
    
	this.LookupCSHID	= function( id )
	{
		var idInfo	= mAliasFile.LookupID( id );

		if ( !idInfo.Found )
		{
			var subIDInfo	= null;
			
			for ( var i = 0; i < mSubsystems.length; i++ )
			{
				var subsystem	= mSubsystems[i];
				
				subIDInfo = subsystem.LookupCSHID( id );
				
				if ( subIDInfo.Found )
				{
					idInfo = subIDInfo;
					
					var myPathUrl	= new CMCUrl( this.GetPath() );
					var subPathUrl	= new CMCUrl( subsystem.GetPath() );
					var relUrl		= subPathUrl.ToRelative( myPathUrl );
					
					idInfo.Topic = relUrl.FullPath + idInfo.Topic;
					
					break;
				}
			}
		}
		
		return idInfo;
	};
	
	this.GetTocFile = function()
	{
		return mTocFile;
	};
	
	this.GetBrowseSequenceFile = function()
	{
		return mBrowseSequenceFile;
	};
    
	this.GetIndex       = function( onCompleteFunc, onCompleteArgs )
	{
		if ( !this.IsWebHelpPlus )
		{
			var xmlDoc		= LoadFirstIndex();
			var preMerged	= FMCGetAttributeBool( xmlDoc.documentElement, "PreMerged", false );
	        
			if ( !preMerged && mSubsystems.length != 0 )
			{
				xmlDoc = LoadEntireIndex();
	            
				for ( var i = 0; i < mSubsystems.length; i++ )
				{
					var subsystem	= mSubsystems[i];
	                
					if ( !subsystem.GetExists() )
					{
						continue;
					}
	                
					var xmlDoc2	= subsystem.GetMergedIndex();
	                
					MergeIndexEntries( xmlDoc.getElementsByTagName( "IndexEntry" )[0], xmlDoc2.getElementsByTagName( "IndexEntry" )[0] );
				}
			}
	        
			onCompleteFunc( xmlDoc, onCompleteArgs );
		}
		else
		{
			function OnGetIndexComplete( xmlDoc, args )
			{
				onCompleteFunc( xmlDoc, onCompleteArgs );
			}

			var xmlDoc	= CMCXmlParser.CallWebService( MCGlobals.RootFolder + "Service/Service.asmx/GetIndex", true, OnGetIndexComplete, null );
		}
	};
    
	this.GetMergedIndex = function()
	{
		var xmlDoc  = LoadEntireIndex();
        
		for ( var i = 0; i < mSubsystems.length; i++ )
		{
			var subsystem   = mSubsystems[i];
            
			if ( !subsystem.GetExists() )
			{
				continue;
			}
            
			var xmlDoc2 = subsystem.GetMergedIndex();
            
			MergeIndexEntries( xmlDoc.getElementsByTagName( "IndexEntry" )[0], xmlDoc2.getElementsByTagName( "IndexEntry" )[0] );
		}
        
		return xmlDoc;
	};
    
	this.HasBrowseSequences	= function()
	{
		var xmlFile	= mXmlFile.substring( 0, mXmlFile.lastIndexOf( "." ) ) + ".xml";
		var xmlDoc	= CMCXmlParser.GetXmlDoc( xmlFile, false, null, null );
		
		return xmlDoc.documentElement.getAttribute( "BrowseSequence" ) != null;
	};
    
	this.HasToc				= function()
	{
		var xmlFile	= mXmlFile.substring( 0, mXmlFile.lastIndexOf( "." ) ) + ".xml";
		var xmlDoc	= CMCXmlParser.GetXmlDoc( xmlFile, false, null, null );
		
		return xmlDoc.documentElement.getAttribute( "Toc" ) != null;
	};
    
	this.IsMerged       = function()
	{
		return (mSubsystems.length > 0);
	};
    
	this.GetConceptsLinks	= function( conceptTerms, callbackFunc, callbackArgs )
	{
		if ( this.IsWebHelpPlus )
		{
			function OnGetTopicsForConceptsComplete( xmlDoc, args )
			{
				var links		= new Array();
				var nodes		= xmlDoc.documentElement.getElementsByTagName( "Url" );
				var nodeLength	= nodes.length;
				
				for ( var i = 0; i < nodeLength; i++ )
				{
					var node	= nodes[i];
					var title	= node.getAttribute( "Title" );
					var url		= node.getAttribute( "Source" );
	                
					url = mPath + ((url.charAt( 0 ) == "/") ? url.substring( 1, url.length ) : url);
	                
					links[links.length] = title + "|" + url;
				}
				
				callbackFunc( links, callbackArgs );
			}
			
			var xmlDoc	= CMCXmlParser.CallWebService( MCGlobals.RootFolder + "Service/Service.asmx/GetTopicsForConcepts?Concepts=" + conceptTerms, true, OnGetTopicsForConceptsComplete, null );
		}
		else
		{
			var links	= null;

			conceptTerms = conceptTerms.replace( "\\;", "%%%%%" );
			
			if ( conceptTerms == "" )
			{
				links = new Array();
				callbackFunc( links, callbackArgs );
			}
			
			var concepts	= conceptTerms.split( ";" );
			
			links = this.GetConceptsLinksLocal( concepts );
			
			callbackFunc( links, callbackArgs );
		}
	};
		
	this.GetConceptsLinksLocal	= function( concepts )
	{
		var links	= new Array();
		
		for ( var i = 0; i < concepts.length; i++ )
		{
			var concept	= concepts[i];
			
			concept = concept.replace( "%%%%%", ";" );
			concept = concept.toLowerCase();
			
			var currLinks	= this.GetConceptLinksLocal( concept );
	        
			for ( var j = 0; j < currLinks.length; j++ )
			{
				links[links.length] = currLinks[j];
			}
		}
		
		return links;
	};
    
	this.GetConceptLinksLocal	= function( concept )
	{
		LoadConcepts();
		
		var links	= mViewedConceptMap.GetItem( concept );
	        
		if ( !links )
		{
			links = mConceptMap.GetItem( concept );
            
			if ( !links )
			{
				links = new Array( 0 );
			}
			
			for ( var i = 0; i < mSubsystems.length; i++ )
			{
				var subsystem   = mSubsystems[i];
	            
				if ( !subsystem.GetExists() )
				{
					continue;
				}
	            
				MergeConceptLinks( links, subsystem.GetConceptLinksLocal( concept ) );
			}

			mViewedConceptMap.Add( concept, links );
		}
		
		return links;
	};
    
	this.LoadGlossary   = function( onCompleteFunc, onCompleteArgs )
	{
		if ( !this.IsWebHelpPlus )
		{
			if ( !this.IsMerged() )
			{
				return;
			}
	        
			var xmlDoc	= this.GetGlossary();
			
			onCompleteFunc( xmlDoc, onCompleteArgs );
		}
		else
		{
			function OnGetGlossaryComplete( xmlDoc, args )
			{
				onCompleteFunc( xmlDoc, onCompleteArgs );
			}

			var xmlDoc	= CMCXmlParser.CallWebService( MCGlobals.RootFolder + "Service/Service.asmx/GetGlossary", true, OnGetGlossaryComplete, null );
		}
	}
    
	this.GetGlossary    = function()
	{
		var xmlDoc	= CMCXmlParser.GetXmlDoc( this.GlossaryUrl, false, null, null );
        
		for ( var i = 0; i < mSubsystems.length; i++ )
		{
			var subsystem   = mSubsystems[i];
            
			if ( !subsystem.GetExists() )
			{
				continue;
			}
            
			MergeGlossaries( xmlDoc, subsystem );
		}
        
		return xmlDoc;
	};
    
	this.GetSearchDBs   = function()
	{
		var searchDBs	= new Array();
		var rootFrame	= FMCGetRootFrame();
		var xmlDoc      = CMCXmlParser.GetXmlDoc( mPath + "Data/Search.xml", false, null, null );
		var preMerged	= FMCGetAttributeBool( xmlDoc.documentElement, "PreMerged", false );

		searchDBs[searchDBs.length] = new rootFrame.frames["navigation"].frames["search"].CMCSearchDB( "Data/Search.xml", this );
        
		if ( !preMerged )
		{
			for ( var i = 0; i < mSubsystems.length; i++ )
			{
				var subsystem   = mSubsystems[i];
	            
				if ( !subsystem.GetExists() )
				{
					continue;
				}
	            
				var searchDBs2  = subsystem.GetSearchDBs();
	            
				for ( var j = 0; j < searchDBs2.length; j++ )
				{
					searchDBs[searchDBs.length] = searchDBs2[j];
				}
			}
		}
        
		return searchDBs;
	};
	
	this.AdvanceTopic = function( tocType, moveType, tocPath, href )
	{
		var file = null;
		
		if ( tocType == "toc" )
		{
			file = mTocFile;
		}
		else if ( tocType == "browsesequences" )
		{
			file = mBrowseSequenceFile;
		}
		
		file.AdvanceTopic( moveType, tocPath, href );
	};
    
	// Private member functions
    
	function GetGlossaryUrl( xmlDoc )
	{
		var glossaryUrlRel = xmlDoc.documentElement.getAttribute( "Glossary" );
		
		if ( glossaryUrlRel == null )
		{
			return null;
		}
		
		var pos = glossaryUrlRel.lastIndexOf( "." );
		
		glossaryUrlRel = glossaryUrlRel.substring( 0, pos + 1 ) + "xml";
		
		return mPath + glossaryUrlRel;
	}
    
	function LoadFirstIndex()
	{
		var xmlDoc	= CMCXmlParser.GetXmlDoc( mPath + "Data/Index.xml", false, null, null );
        
		return xmlDoc;
	}
    
	function LoadEntireIndex()
	{
		var xmlDoc      = LoadFirstIndex();
		var head        = xmlDoc.documentElement;
		var chunkNodes  = xmlDoc.getElementsByTagName( "Chunk" );
        
		if ( chunkNodes.length > 0 )
		{
			// Remove all attributes except "Count"
            
			var attributesClone = head.cloneNode( false ).attributes;
            
			for ( var i = 0; i < attributesClone.length; i++ )
			{
				if ( attributesClone[i].nodeName != "Count" && attributesClone[i].nodeName != "count" )
				{
					head.removeAttribute( attributesClone[i].nodeName );
				}
			}
            
			// Merge all chunks
            
			for ( var i = 0; i < chunkNodes.length; i++ )
			{
				var xmlDoc2 = CMCXmlParser.GetXmlDoc( mPath + "Data/" + FMCGetAttribute( chunkNodes[i], "Link" ), false, null, null );
                
				MergeIndexEntries( xmlDoc.getElementsByTagName( "IndexEntry" )[0], xmlDoc2.getElementsByTagName( "IndexEntry" )[0] );
			}
            
			head.removeChild( chunkNodes[0].parentNode );
		}
        
		// Make links absolute
        
		for ( var i = 0; i < xmlDoc.documentElement.childNodes.length; i++ )
		{
			if ( xmlDoc.documentElement.childNodes[i].nodeName == "IndexEntry" )
			{
				ConvertIndexLinksToAbsolute( xmlDoc.documentElement.childNodes[i] );
                
				break;
			}
		}
        
		//
        
		return xmlDoc;
	}
    
	function MergeIndexEntries( indexEntry1, indexEntry2 )
	{
		var xmlDoc1     = indexEntry1.ownerDocument;
		var entries1    = indexEntry1.getElementsByTagName( "Entries" )[0];
		var entries2    = indexEntry2.getElementsByTagName( "Entries" )[0];
		var entries     = xmlDoc1.createElement( "IndexEntry" ).appendChild( xmlDoc1.createElement( "Entries" ) );
        
		if ( entries1.getElementsByTagName( "IndexEntry" ).length == 0 )
		{
			if ( typeof( xmlDoc1.importNode ) == "function" )
			{
				entries = xmlDoc1.importNode( entries2, true );
			}
			else
			{
				entries = entries2.cloneNode( true );
			}
		}
		else if ( entries2.getElementsByTagName( "IndexEntry" ).length == 0 )
		{
			entries = entries1.cloneNode( true );
		}
		else
		{
			for ( var i = 0, j = 0; i < entries1.childNodes.length && j < entries2.childNodes.length; )
			{
				var currIndexEntry1 = entries1.childNodes[i];
				var currIndexEntry2 = entries2.childNodes[j];
                
				if ( currIndexEntry1.nodeType != 1 )
				{
					i++;
					continue;
				}
				else if ( currIndexEntry2.nodeType != 1 )
				{
					j++;
					continue;
				}
				
				var term1	= FMCGetAttribute( currIndexEntry1, "Term" ).toLowerCase();
				var term2	= FMCGetAttribute( currIndexEntry2, "Term" ).toLowerCase();
                
				if ( term1 == term2 )
				{
					MergeIndexEntries( currIndexEntry1, currIndexEntry2 );
                    
					var links1      = FMCGetChildNodesByTagName( currIndexEntry1, "Links" )[0];
					var indexLinks2 = FMCGetChildNodesByTagName( currIndexEntry2, "Links" )[0].getElementsByTagName( "IndexLink" );
                    
					for ( var k = 0; k < indexLinks2.length; k++ )
					{
						if ( typeof( xmlDoc1.importNode ) == "function" )
						{
							links1.appendChild( xmlDoc1.importNode( indexLinks2[k], true ) );
						}
						else
						{
							links1.appendChild( indexLinks2[k].cloneNode( true ) );
						}
					}
                    
					entries.appendChild( currIndexEntry1.cloneNode( true ) );
					i++;
					j++;
				}
				else if ( term1 > term2 )
				{
					if ( typeof( xmlDoc1.importNode ) == "function" )
					{
						entries.appendChild( xmlDoc1.importNode( currIndexEntry2, true ) );
					}
					else
					{
						entries.appendChild( currIndexEntry2.cloneNode( true ) );
					}
                    
					j++;
				}
				else
				{
					entries.appendChild( currIndexEntry1.cloneNode( true ) );
					i++;
				}
			}
            
			// Append remaining nodes. There should never be a case where BOTH entries1 AND entries2 have remaining nodes.
            
			for ( ; i < entries1.childNodes.length; i++ )
			{
				entries.appendChild( entries1.childNodes[i].cloneNode( true ) );
			}
            
			for ( ; j < entries2.childNodes.length; j++ )
			{
				if ( typeof( xmlDoc1.importNode ) == "function" )
				{
					entries.appendChild( xmlDoc1.importNode( entries2.childNodes[j], true ) );
				}
				else
				{
					entries.appendChild( entries2.childNodes[j].cloneNode( true ) );
				}
			}
		}
        
		indexEntry1.replaceChild( entries, entries1 );
	}
    
	function ConvertGlossaryPageEntryToAbsolute( glossaryPageEntry, path )
	{
		var entryNode	= glossaryPageEntry.getElementsByTagName( "a" )[0];
		var href		= FMCGetAttribute( entryNode, "href" );

		entryNode.setAttribute( "href", path + href );
	}
    
	function ConvertIndexLinksToAbsolute( indexEntry )
	{
		for ( var i = 0; i < indexEntry.childNodes.length; i++ )
		{
			var currNode    = indexEntry.childNodes[i];
            
			if ( currNode.nodeName == "Entries" )
			{
				for ( var j = 0; j < currNode.childNodes.length; j++ )
				{
					ConvertIndexLinksToAbsolute( currNode.childNodes[j] );
				}
			}
			else if ( currNode.nodeName == "Links" )
			{
				for ( var j = 0; j < currNode.childNodes.length; j++ )
				{
					if ( currNode.childNodes[j].nodeType == 1 )
					{
						var link    = FMCGetAttribute( currNode.childNodes[j], "Link" );
                        
						link = mPath + ((link.charAt( 0 ) == "/") ? link.substring( 1, link.length ) : link);
						currNode.childNodes[j].setAttribute( "Link", link );
					}
				}
			}
		}
	}
    
	function LoadConcepts()
	{
		if ( mConceptMap )
		{
			return;
		}
        
		mConceptMap = new CMCDictionary();
        
		var xmlDoc	= CMCXmlParser.GetXmlDoc( mPath + "Data/Concepts.xml", false, null, null );
		var xmlHead	= xmlDoc.documentElement;
        
		for ( var i = 0; i < xmlHead.childNodes.length; i++ )
		{
			var entry   = xmlHead.childNodes[i];
            
			if ( entry.nodeType != 1 ) { continue; }
            
			var term    = entry.getAttribute( "Term" ).toLowerCase();
			var links   = new Array();
            
			for ( var j = 0; j < entry.childNodes.length; j++ )
			{
				var link    = entry.childNodes[j];
                
				if ( link.nodeType != 1 ) { continue; }
                
				var title   = link.getAttribute( "Title" );
				var url     = link.getAttribute( "Link" );
                
				url = mPath + ((url.charAt( 0 ) == "/") ? url.substring( 1, url.length ) : url);
                
				links[links.length] = title + "|" + url;
			}
            
			mConceptMap.Add( term, links );
		}
	}
    
	function MergeConceptLinks( links1, links2 )
	{
		if ( !links2 )
		{
			return;
		}
        
		for ( var i = 0; i < links2.length; i++ )
		{
			links1[links1.length] = links2[i];
		}
	}
    
	function MergeGlossaries( xmlDoc1, subsystem )
	{
		var xmlDoc2	= subsystem.GetGlossary();
		var divs1   = xmlDoc1.getElementsByTagName( "div" );
		var divs2   = xmlDoc2.getElementsByTagName( "div" );
		var body1   = null;
		var body2   = null;
		var body    = xmlDoc1.createElement( "div" );
        
		body.setAttribute( "id", "GlossaryBody" );
        
		for ( var i = 0; i < divs1.length; i++ )
		{
			if ( divs1[i].getAttribute( "id" ) == "GlossaryBody" )
			{
				body1 = divs1[i];
				break;
			}
		}
        
		for ( var i = 0; i < divs2.length; i++ )
		{
			if ( divs2[i].getAttribute( "id" ) == "GlossaryBody" )
			{
				body2 = divs2[i];
				break;
			}
		}
        
		//
        
		var glossUrl	= subsystem.GlossaryUrl;
		var pos			= glossUrl.lastIndexOf( "/" );
		var subPath		= glossUrl.substring( 0, pos + 1 );
        
		//
        
		if ( body1.getElementsByTagName( "div" ).length == 0 )
		{
			if ( typeof( xmlDoc1.importNode ) == "function" )
			{
				body = xmlDoc1.importNode( body2, true );
			}
			else
			{
				body = body2.cloneNode( true );
			}
            
			for ( var i = 0; i < body.childNodes.length; i++ )
			{
				var currNode	= body.childNodes[i];
				
				if ( currNode.nodeType != 1 || currNode.nodeName != "div" )
				{
					continue;
				}
				
				ConvertGlossaryPageEntryToAbsolute( currNode, subPath );
			}
		}
		else if ( body2.getElementsByTagName( "div" ).length == 0 )
		{
			body = body1.cloneNode( true );
		}
		else
		{
			for ( var i = 0, j = 0; i < body1.childNodes.length && j < body2.childNodes.length; )
			{
				var currGlossaryPageEntry1  = body1.childNodes[i];
				var currGlossaryPageEntry2  = body2.childNodes[j];
                
				if ( currGlossaryPageEntry1.nodeType != 1 )
				{
					i++;
					continue;
				}
				else if ( currGlossaryPageEntry2.nodeType != 1 )
				{
					j++;
					continue;
				}
                
				var term1   = currGlossaryPageEntry1.getElementsByTagName( "div" )[0].getElementsByTagName( "a" )[0].firstChild.nodeValue;
				var term2   = currGlossaryPageEntry2.getElementsByTagName( "div" )[0].getElementsByTagName( "a" )[0].firstChild.nodeValue;
                
				if ( term1.toLowerCase() == term2.toLowerCase() )
				{
					body.appendChild( currGlossaryPageEntry1.cloneNode( true ) );
					i++;
					j++;
				}
				else if ( term1.toLowerCase() > term2.toLowerCase() )
				{
					var newGlossaryPageEntry	= null;
					
					if ( typeof( xmlDoc1.importNode ) == "function" )
					{
						newGlossaryPageEntry = xmlDoc1.importNode( currGlossaryPageEntry2, true );
					}
					else
					{
						newGlossaryPageEntry = currGlossaryPageEntry2.cloneNode( true );
					}
                    
					ConvertGlossaryPageEntryToAbsolute( newGlossaryPageEntry, subPath );
					body.appendChild( newGlossaryPageEntry )
                    
					j++;
				}
				else
				{
					body.appendChild( currGlossaryPageEntry1.cloneNode( true ) );
					i++;
				}
			}
            
			// Append remaining nodes. There should never be a case where BOTH entries1 AND entries2 have remaining nodes.
            
			for ( ; i < body1.childNodes.length; i++ )
			{
				body.appendChild( body1.childNodes[i].cloneNode( true ) );
			}
            
			for ( ; j < body2.childNodes.length; j++ )
			{
				var currNode	= body2.childNodes[j];
				
				if ( currNode.nodeType != 1 )
				{
					continue;
				}
				
				var newNode		= null;
				
				if ( typeof( xmlDoc1.importNode ) == "function" )
				{
					newNode = xmlDoc1.importNode( body2.childNodes[j], true );
				}
				else
				{
					newNode = body2.childNodes[j].cloneNode( true );
				}
                
				ConvertGlossaryPageEntryToAbsolute( newNode, subPath );
				body.appendChild( newNode );
			}
		}
        
		body1.parentNode.replaceChild( body, body1 );
	}
}

//
//    End class CMCHelpSystem
//

/* -CatapultCompiler- -End- -Copy to CSH Javascript- */

/* -CatapultCompiler- -Begin- -Copy to CSH Javascript- */

//
//    Enumeration EMCTocType
//

var EMCTocType	= new function()
{
}

EMCTocType.Toc				= 0;
EMCTocType.BrowseSequence	= 1;

//
//    End enumeration EMCTocType
//

/* -CatapultCompiler- -End- -Copy to CSH Javascript- */

/* -CatapultCompiler- -Begin- -Copy to CSH Javascript- */

//
//    Class CMCTocFile
//

function CMCTocFile( helpSystem, tocType )
{
	// Private member variables

	var mSelf					= this;
	var mHelpSystem				= helpSystem;
	var mTocType				= tocType;
	var mInitialized			= false;
	var mXmlDoc					= null;
	var mInitOnCompleteFuncs	= new Array();
	var mTocPath				= null;
	var mTocHref				= null;
	var mOwnerHelpSystems		= new Array();

	// Public properties

	// Constructor

	(function()
	{
	})();

	// Public member functions
	
	this.Init = function( OnCompleteFunc )
	{
		if ( mInitialized )
		{
			if ( OnCompleteFunc != null )
			{
				OnCompleteFunc();
			}
			
			return;
		}
	    
		//

		if ( OnCompleteFunc != null )
		{
			mInitOnCompleteFuncs.push( OnCompleteFunc );
		}
	    
		//
		
		var fileName = null;
		
		if ( tocType == EMCTocType.Toc )
		{
			fileName = "Toc.xml";
		}
		else if ( tocType == EMCTocType.BrowseSequence )
		{
			fileName = "BrowseSequences.xml";
		}
	    
		this.LoadToc( mHelpSystem.GetPath() + "Data/" + fileName, OnLoadTocComplete );
		
		function OnLoadTocComplete( xmlDoc )
		{
			mInitialized = true;
			
			mXmlDoc = xmlDoc;

			InitOnComplete();
		}
	};
	
	this.LoadToc = function( xmlFile, OnCompleteFunc )
	{
		var masterHS = FMCGetHelpSystem();
		var xmlDoc = null;
	    
		if ( mTocType == EMCTocType.Toc && masterHS.IsWebHelpPlus )
		{
			xmlDoc = CMCXmlParser.CallWebService( mHelpSystem.GetPath() + "Service/Service.asmx/GetToc", true, OnTocXmlLoaded, null );
		}
		else if ( mTocType == EMCTocType.BrowseSequence && masterHS.IsWebHelpPlus )
		{
			xmlDoc = CMCXmlParser.CallWebService( mHelpSystem.GetPath() + "Service/Service.asmx/GetBrowseSequences", true, OnTocXmlLoaded, null );
		}
		else
		{
			var xmlPath	= (xmlFile.indexOf( "/" ) == -1) ? mHelpSystem.GetPath() + "Data/" + xmlFile : xmlFile;
			
			xmlDoc = CMCXmlParser.GetXmlDoc( xmlPath, true, OnTocXmlLoaded, null );
		}
		
		function OnTocXmlLoaded( xmlDoc, args )
		{
			if ( !xmlDoc || !xmlDoc.documentElement )
			{
				if ( OnCompleteFunc != null )
				{
					OnCompleteFunc( xmlDoc );
				}
		        
				return;
			}
			
			//
		    
			if ( OnCompleteFunc != null )
			{
				OnCompleteFunc( xmlDoc );
			}
		}
	};
	
	this.LoadChunk = function( parentNode, xmlFile, OnCompleteFunc )
	{
		var xmlPath	= (xmlFile.indexOf( "/" ) == -1) ? mHelpSystem.GetPath() + "Data/" + xmlFile : xmlFile;
		var xmlDoc = CMCXmlParser.GetXmlDoc( xmlPath, true, OnTocXmlLoaded, null );
		
		function OnTocXmlLoaded( xmlDoc, args )
		{
			if ( !xmlDoc || !xmlDoc.documentElement )
			{
				if ( OnCompleteFunc != null )
				{
					OnCompleteFunc( parentNode );
				}
		        
				return;
			}
			
			parentNode.removeAttribute( "Chunk" );
			
			var rootNode = xmlDoc.documentElement;
			
			for ( var i = 0, length = rootNode.childNodes.length; i < length; i++ )
			{
				var childNode = rootNode.childNodes[i];
				
				if ( childNode.nodeType != 1 ) { continue; }
				
				var importedNode = null;
				
				if ( typeof( xmlDoc.importNode ) == "function" )
				{
					importedNode = xmlDoc.importNode( childNode, true );
				}
				else
				{
					importedNode = childNode.cloneNode( true );
				}
				
				parentNode.appendChild( importedNode );
			}
			
			//
		    
			if ( OnCompleteFunc != null )
			{
				OnCompleteFunc( parentNode );
			}
		}
	}
	
	this.LoadMerge = function( parentNode, OnCompleteFunc )
	{
		var mergeHint = FMCGetAttributeInt( parentNode, "MergeHint", -1 );
		
		if ( mergeHint == -1 )
		{
			OnCompleteFunc( parentNode, false, null, null );
		}
		
		parentNode.removeAttribute( "MergeHint" );
		
		var ownerHelpSystem = GetOwnerHelpSystem( parentNode );
		var subsystem = ownerHelpSystem.GetSubsystem( mergeHint );
		var replace = FMCGetAttributeBool( parentNode, "ReplaceMergeNode", false );
			
		if ( !replace )
		{
			parentNode.setAttribute( "ownerHelpSystemIndex", mOwnerHelpSystems.length );
		}
		
		mOwnerHelpSystems[mOwnerHelpSystems.length] = subsystem;
		
		var xmlPath = subsystem.GetPath() + "Data/" + (mTocType == EMCTocType.Toc ? "Toc.xml" : "BrowseSequences.xml");
		var xmlDoc = CMCXmlParser.GetXmlDoc( xmlPath, true, OnTocXmlLoaded, null );
		
		function OnTocXmlLoaded( xmlDoc, args )
		{
			if ( !xmlDoc || !xmlDoc.documentElement )
			{
				if ( OnCompleteFunc != null )
				{
					OnCompleteFunc( parentNode, false, null, null );
				}
		        
				return;
			}

			var rootNode = xmlDoc.documentElement;
			var currNode = null;
			var isFirst = true;
			var firstNode = null;
			var lastNode = null;
			
			for ( var i = 0, length = rootNode.childNodes.length; i < length; i++ )
			{
				var childNode = rootNode.childNodes[i];
				
				if ( childNode.nodeType != 1 ) { continue; }
				
				var importedNode = null;
				
				if ( typeof( xmlDoc.importNode ) == "function" )
				{
					importedNode = xmlDoc.importNode( childNode, true );
				}
				else
				{
					importedNode = childNode.cloneNode( true );
				}
				
				if ( replace )
				{
					importedNode.setAttribute( "ownerHelpSystemIndex", mOwnerHelpSystems.length - 1 );
					
					if ( isFirst )
					{
						isFirst = false;
						
						parentNode.parentNode.replaceChild( importedNode, parentNode );
						
						firstNode = importedNode;
						
						currNode = importedNode;
					}
					else
					{
						currNode.parentNode.insertBefore( importedNode, currNode.nextSibling );
						
						lastNode = importedNode;
					}
				}
				else
				{
					parentNode.appendChild( importedNode );
				}
			}
			
			//
		    
			if ( OnCompleteFunc != null )
			{
				OnCompleteFunc( parentNode, replace, firstNode, lastNode );
			}
		}
	}
	
	this.AdvanceTopic = function( moveType, tocPath, href )
	{
		this.GetTocNode( tocPath, href, OnComplete );

		function OnComplete( tocNode )
		{
			if ( tocNode == null )
			{
				return;
			}
			
			var moveNode = null;
			
			GetMoveTocTopicNode( moveType, tocNode, OnGetMoveTocNodeComplete );
			
			function OnGetMoveTocNodeComplete( moveNode )
			{
				if ( moveNode != null )
				{
					var href = FMCGetAttribute( moveNode, "Link" );
					
					if ( FMCIsHtmlHelp() )
					{
						href = href.substring( "/Content/".length );
					}
					else
					{
						href = href.substring( "/".length );
					}

					var hrefUrl = new CMCUrl( href );

					// CHMs don't support query strings in links
					if ( !FMCIsHtmlHelp() )
					{
						var prefix = null;
						
						if ( mTocType == EMCTocType.Toc )
						{
							prefix = "TocPath";
						}
						else if ( mTocType == EMCTocType.BrowseSequence )
						{
							prefix = "BrowseSequencePath";
						}

						var tocPath = GetTocPath(moveNode);
						var newHrefUrl = hrefUrl.ToQuery( prefix + "=" + encodeURIComponent( tocPath ) );
						
						href = newHrefUrl.FullPath;
					}
					
					var subsystem = GetOwnerHelpSystem( moveNode );
					
					href = subsystem.GetPath() + href;
					
					MCGlobals.BodyFrame.document.location.href = href;
				}
			}
		}
	};
	
	this.GetRootNode = function( onCompleteFunc )
	{
		this.Init( OnInit );
		
		function OnInit()
		{
			onCompleteFunc( mXmlDoc.documentElement );
		}
	};
	
	this.GetTocNode = function( tocPath, href, onCompleteFunc )
	{
		this.Init( OnInit );

		function OnInit()
		{
			mTocPath = tocPath;
			mTocHref = href;

			//

			var steps = (tocPath == "") ? new Array( 0 ) : tocPath.split( "|" );
			var linkNodeIndex = -1;
			
			if ( steps.length > 0 )
			{
				var lastStep = steps[steps.length - 1];
				
				if ( lastStep.StartsWith( "$$$$$" ) )
				{
					linkNodeIndex = parseInt( lastStep.substring( "$$$$$".length ) );
					steps.splice( steps.length - 1, 1 );
				}
			}
			
			var tocNode = mXmlDoc.documentElement;

			for ( var i = 0, length = steps.length; i < length; i++ )
			{
				if ( CheckChunk( tocNode ) )
				{
					return;
				}
				
				if ( CheckMerge( tocNode ) )
				{
					return;
				}
				
				//
				
				tocNode = FindBook( tocNode, steps[i] );
			}

			if ( tocNode == null )
			{
				onCompleteFunc( null );
				
				return;
			}
			
			if ( CheckChunk( tocNode ) )
			{
				return;
			}
			
			if ( CheckMerge( tocNode ) )
			{
				return;
			}
			
			if ( linkNodeIndex >= 0 )
			{
				if ( linkNodeIndex == 0 )
				{
					foundNode = tocNode;
				}
				else
				{
					foundNode = FMCGetChildNodeByTagName( tocNode, "TocEntry", linkNodeIndex - 1 );
				}
			}
			else
			{
				var ownerHelpSystem = GetOwnerHelpSystem( tocNode );
				var relHref = href.ToRelative( new CMCUrl( ownerHelpSystem.GetPath() ) );
				var foundNode = FindLink( tocNode, relHref.FullPath.toLowerCase(), true );

				if ( !foundNode )
				{
					foundNode = FindLink( tocNode, relHref.PlainPath.toLowerCase(), false );
				}
			}
			
			//

			mTocPath = null;
			mTocHref = null;
			
			//
			
			onCompleteFunc( foundNode );
		}
		
		function CheckChunk( tocNode )
		{
			var chunk = FMCGetAttribute( tocNode, "Chunk" );

			if ( chunk != null )
			{
				mSelf.LoadChunk( tocNode, chunk,
					function( tocNode )
					{
						mSelf.GetTocNode( mTocPath, mTocHref, onCompleteFunc )
					}
				);

				return true;
			}
			
			return false;
		}
		
		function CheckMerge( tocNode )
		{
			var mergeHint = FMCGetAttributeInt( tocNode, "MergeHint", -1 );

			if ( mergeHint >= 0 )
			{
				mSelf.LoadMerge( tocNode,
					function( tocNode )
					{
						mSelf.GetTocNode( mTocPath, mTocHref, onCompleteFunc )
					}
				);
				
				return true;
			}
			
			return false;
		}
	};
	
	this.GetEntrySequenceIndex = function( tocPath, href, onCompleteFunc )
	{
		this.GetTocNode( tocPath, href, OnCompleteGetTocNode );
		
		function OnCompleteGetTocNode( tocNode )
		{
			var sequenceIndex = -1;
			
			if ( tocNode != null )
			{
				sequenceIndex = ComputeEntrySequenceIndex( tocNode );
			}
			
			onCompleteFunc( sequenceIndex );
		}
	};
	
	this.GetIndexTotalForEntry = function( tocPath, href, onCompleteFunc )
	{
		this.GetTocNode( tocPath, href, OnCompleteGetTocNode );
		
		function OnCompleteGetTocNode( tocNode )
		{
			var total = -1;
			
			if ( tocNode != null )
			{
				var currNode = tocNode;
				
				while ( currNode.parentNode != mXmlDoc.documentElement )
				{
					currNode = currNode.parentNode;
				}
				
				total = FMCGetAttributeInt( currNode, "DescendantCount", -1 );
			}
			
			onCompleteFunc( total );
		}
	};
	
	// Private member functions
	
	function InitOnComplete()
	{
		for ( var i = 0, length = mInitOnCompleteFuncs.length; i < length; i++ )
		{
			mInitOnCompleteFuncs[i]();
		}
	}
	
	function FindBook( tocNode, step )
	{
		var foundNode = null;

		for ( var i = 0; i < tocNode.childNodes.length; i++ )
		{
			if ( tocNode.childNodes[i].nodeName == "TocEntry" && FMCGetAttribute( tocNode.childNodes[i], "Title" ) == step )
			{
				foundNode = tocNode.childNodes[i];
				
				break;
			}
		}
		
		return foundNode;
	}

	function FindLink( node, bodyHref, exactMatch )
	{
		var foundNode = null;
		var bookHref = FMCGetAttribute( node, "Link" );

		if ( bookHref != null )
		{
			if ( FMCIsHtmlHelp() )
			{
				bookHref = bookHref.substring( "/Content/".length );
			}
			else
			{
				bookHref = bookHref.substring( "/".length );
			}
			
			bookHref = bookHref.replace( /%20/g, " " );
			bookHref = bookHref.toLowerCase();
		}
	    
		if ( bookHref == bodyHref )
		{
			foundNode = node;
		}
		else
		{
			for ( var k = 0; k < node.childNodes.length; k++ )
			{
				var currNode = node.childNodes[k];
				
				if ( currNode.nodeType != 1 ) { continue; }
				
				var currTopicHref = FMCGetAttribute( currNode, "Link" );
				
				if ( currTopicHref == null )
				{
					continue;
				}
				
				if ( FMCIsHtmlHelp() )
				{
					currTopicHref = currTopicHref.substring( "/Content/".length );
				}
				else
				{
					currTopicHref = currTopicHref.substring( "/".length );
				}

				currTopicHref = currTopicHref.replace( /%20/g, " " );
				currTopicHref = currTopicHref.toLowerCase();
				
				if ( !exactMatch )
				{
					var hashPos = currTopicHref.indexOf( "#" );

					if ( hashPos != -1 )
					{
						currTopicHref = currTopicHref.substring( 0, hashPos );
					}
					
					var searchPos = currTopicHref.indexOf( "?" );
					
					if ( searchPos != -1 )
					{
						currTopicHref = currTopicHref.substring( 0, searchPos );
					}
				}
	            
				if ( currTopicHref == bodyHref )
				{
					foundNode = currNode;
					
					break;
				}
			}
		}
		
		return foundNode;
	}
	
	function GetMoveTocTopicNode( moveType, tocNode, onCompleteFunc )
	{
		if ( moveType == "previous" )
		{
			GetPreviousNode( tocNode );
		}
		else if ( moveType == "next" )
		{
			GetNextNode( tocNode );
		}
		
		function OnCompleteGetNode( moveNode )
		{
			var moveTopicNode = null;
			
			if ( moveNode != null )
			{
				var link = FMCGetAttribute( moveNode, "Link" );
				
				if ( link == null )
				{
					GetMoveTocTopicNode( moveType, moveNode, onCompleteFunc );

					return;
				}
				
				var linkUrl = new CMCUrl( link );
				var ext = linkUrl.Extension.toLowerCase();
				
				if ( ext != "htm" && ext != "html" )
				{
					GetMoveTocTopicNode( moveType, moveNode, onCompleteFunc );

					return;
				}
				
				moveTopicNode = moveNode;
			}
			
			onCompleteFunc( moveTopicNode );
		}

		function GetPreviousNode( tocNode )
		{
			function OnLoadChunk( tNode )
			{
				var childTocNode = GetDeepestChild( tNode, "TocEntry" );
				
				if ( childTocNode == null )
				{
					previousNode = tNode;
				}
				else
				{
					previousNode = childTocNode;
					
					if ( CheckChunk( childTocNode, OnLoadChunk ) )
					{
						return;
					}
					
					if ( CheckMerge( childTocNode, OnLoadMerge ) )
					{
						return;
					}
				}
				
				OnCompleteGetNode( previousNode );
			}
			
			function OnLoadMerge( tNode, replaced, firstNode, lastNode )
			{
				if ( replaced )
				{
					OnLoadChunk( lastNode );
				}
				else
				{
					OnLoadChunk( tNode );
				}
			}
			
			var previousNode = null;
			
			for ( var currNode = tocNode.previousSibling; currNode != null; currNode = currNode.previousSibling )
			{
				if ( currNode.nodeName == "TocEntry" )
				{
					previousNode = currNode;
					break;
				}
			}
			
			if ( previousNode != null )
			{
				if ( CheckChunk( previousNode, OnLoadChunk ) )
				{
					return;
				}
				
				if ( CheckMerge( previousNode, OnLoadMerge ) )
				{
					return;
				}

				OnLoadChunk( previousNode );
				
				return;
			}
			else
			{
				if ( tocNode.parentNode.nodeType == 1 )
				{
					previousNode = tocNode.parentNode;
				}
			}
			
			OnCompleteGetNode( previousNode );
		}
		
		function GetNextNode( tocNode )
		{
			function OnLoadChunk( tNode )
			{
				var nextNode = FMCGetChildNodeByTagName( tNode, "TocEntry", 0 );
				
				for ( var currNode = tNode; currNode != null && nextNode == null; currNode = currNode.parentNode )
				{
					nextNode = FMCGetSiblingNodeByTagName( currNode, "TocEntry" );
				}
				
				OnCompleteGetNode( nextNode );
			}
			
			function OnLoadMerge( tNode, replaced, firstNode, lastNode )
			{
				if ( replaced )
				{
					OnCompleteGetNode( firstNode );
					
					return;
				}
				
				OnLoadChunk( tNode );
			}
			
			var nextNode = null;
			
			if ( CheckChunk( tocNode, OnLoadChunk ) )
			{
				return;
			}
			
			if ( CheckMerge( tocNode, OnLoadMerge ) )
			{
				return;
			}
			
			OnLoadChunk( tocNode );
		}
		
		function CheckChunk( tocNode, OnCompleteFunc )
		{
			var chunk = FMCGetAttribute( tocNode, "Chunk" );

			if ( chunk != null )
			{
				mSelf.LoadChunk( tocNode, chunk, OnCompleteFunc );

				return true;
			}
			
			return false;
		}
		
		function CheckMerge( tocNode, OnCompleteFunc )
		{
			var mergeHint = FMCGetAttributeInt( tocNode, "MergeHint", -1 );

			if ( mergeHint >= 0 )
			{
				mSelf.LoadMerge( tocNode, OnCompleteFunc );
				
				return true;
			}
			
			return false;
		}
	}
	
	function GetDeepestChild( tocNode, nodeName )
	{
		var node = FMCGetLastChildNodeByTagName( tocNode, nodeName );
		
		if ( node != null )
		{
			var nodeChild = GetDeepestChild( node, nodeName );
			
			if ( nodeChild != null )
			{
				return nodeChild;
			}
			
			return node;
		}
		
		return null;
	}
	
	function GetOwnerHelpSystem( tocNode )
	{
		var ownerHelpSystem = null;
		var currNode = tocNode;

		while ( true )
		{
			if ( currNode == currNode.ownerDocument.documentElement )
			{
				ownerHelpSystem = mHelpSystem;

				break;
			}
			
			var ownerHelpSystemIndex = FMCGetAttributeInt( currNode, "ownerHelpSystemIndex", -1 );

			if ( ownerHelpSystemIndex >= 0 )
			{
				ownerHelpSystem = mOwnerHelpSystems[ownerHelpSystemIndex];
				
				break;
			}
			
			currNode = currNode.parentNode;
		}

		return ownerHelpSystem;
	}
	
	function GetTocPath( tocNode )
	{
		var tocPath = "";
		var linkNodeIndex = -1;
		var childNode = FMCGetChildNodeByTagName( tocNode, "TocEntry", 0 );

		if ( childNode != null )
		{
			tocPath = FMCGetAttribute( tocNode, "Title" );
			
			linkNodeIndex = 0;
		}
		else
		{
			linkNodeIndex = FMCGetChildIndex( tocNode ) + 1;
		}
		
		if ( tocPath.length > 0 )
		{
			tocPath += "|";
		}
		
		tocPath += ("$$$$$" + linkNodeIndex);
		
		for ( var currNode = tocNode.parentNode; currNode != null && currNode.parentNode.nodeType == 1; currNode = currNode.parentNode )
		{
			if ( tocPath == null )
			{
				tocPath = "";
			}
			
			if ( tocPath.length > 0 )
			{
				tocPath = "|" + tocPath;
			}
			
			tocPath = FMCGetAttribute( currNode, "Title" ) + tocPath;
		}
		
		return tocPath;
	}
	
	function ComputeEntrySequenceIndex( tocNode )
	{
		if ( tocNode.parentNode == tocNode.ownerDocument.documentElement )
		{
			return 0;
		}
		
		var sequenceIndex = 0;
		
		var link = FMCGetAttribute( tocNode, "Link" );
			
		if ( link != null )
		{
			sequenceIndex++;
		}

		for ( var currNode = tocNode.previousSibling; currNode != null; currNode = currNode.previousSibling )
		{
			if ( currNode.nodeType != 1 ) { continue; }
			
			var descendantCount = FMCGetAttributeInt( currNode, "DescendantCount", 0 );
			
			sequenceIndex += descendantCount;
			
			var link = FMCGetAttribute( currNode, "Link" );
			
			if ( link != null )
			{
				var linkUrl = new CMCUrl( link );
				var ext = linkUrl.Extension.toLowerCase();
				
				if ( ext == "htm" || ext == "html" )
				{
					sequenceIndex++;
				}
			}
		}
		
		return sequenceIndex + ComputeEntrySequenceIndex( tocNode.parentNode );
	}
}

//
//    End class CMCTocFile
//

/* -CatapultCompiler- -End- -Copy to CSH Javascript- */
