/**
 * @class Autolinker
 * @extends Object
 *
 * Utility class used to process a given string of text, and wrap the matches in
 * the appropriate anchor (&lt;a&gt;) tags to turn them into links.
 *
 * Any of the configuration options may be provided in an Object (map) provided
 * to the Autolinker constructor, which will configure how the {@link #link link()}
 * method will process the links.
 *
 * For example:
 *
 *     var autolinker = new Autolinker( {
 *         newWindow : false,
 *         truncate  : 30
 *     } );
 *
 *     var html = autolinker.link( "Joe went to www.yahoo.com" );
 *     // produces: 'Joe went to <a href="http://www.yahoo.com">yahoo.com</a>'
 *
 *
 * The {@link #static-link static link()} method may also be used to inline
 * options into a single call, which may be more convenient for one-off uses.
 * For example:
 *
 *     var html = Autolinker.link( "Joe went to www.yahoo.com", {
 *         newWindow : false,
 *         truncate  : 30
 *     } );
 *     // produces: 'Joe went to <a href="http://www.yahoo.com">yahoo.com</a>'
 *
 *
 * ## Custom Replacements of Links
 *
 * If the configuration options do not provide enough flexibility, a {@link #replaceFn}
 * may be provided to fully customize the output of Autolinker. This function is
 * called once for each URL/Email/Phone#/Twitter Handle/Hashtag match that is
 * encountered.
 *
 * For example:
 *
 *     var input = "...";  // string with URLs, Email Addresses, Phone #s, Twitter Handles, and Hashtags
 *
 *     var linkedText = Autolinker.link( input, {
 *         replaceFn : function( autolinker, match ) {
 *             console.log( "href = ", match.getAnchorHref() );
 *             console.log( "text = ", match.getAnchorText() );
 *
 *             switch( match.getType() ) {
 *                 case 'url' :
 *                     console.log( "url: ", match.getUrl() );
 *
 *                     if( match.getUrl().indexOf( 'mysite.com' ) === -1 ) {
 *                         var tag = autolinker.getTagBuilder().build( match );  // returns an `Autolinker.HtmlTag` instance, which provides mutator methods for easy changes
 *                         tag.setAttr( 'rel', 'nofollow' );
 *                         tag.addClass( 'external-link' );
 *
 *                         return tag;
 *
 *                     } else {
 *                         return true;  // let Autolinker perform its normal anchor tag replacement
 *                     }
 *
 *                 case 'email' :
 *                     var email = match.getEmail();
 *                     console.log( "email: ", email );
 *
 *                     if( email === "my@own.address" ) {
 *                         return false;  // don't auto-link this particular email address; leave as-is
 *                     } else {
 *                         return;  // no return value will have Autolinker perform its normal anchor tag replacement (same as returning `true`)
 *                     }
 *
 *                 case 'phone' :
 *                     var phoneNumber = match.getPhoneNumber();
 *                     console.log( phoneNumber );
 *
 *                     return '<a href="http://newplace.to.link.phone.numbers.to/">' + phoneNumber + '</a>';
 *
 *                 case 'twitter' :
 *                     var twitterHandle = match.getTwitterHandle();
 *                     console.log( twitterHandle );
 *
 *                     return '<a href="http://newplace.to.link.twitter.handles.to/">' + twitterHandle + '</a>';
 *
 *                 case 'hashtag' :
 *                     var hashtag = match.getHashtag();
 *                     console.log( hashtag );
 *
 *                     return '<a href="http://newplace.to.link.hashtag.handles.to/">' + hashtag + '</a>';
 *             }
 *         }
 *     } );
 *
 *
 * The function may return the following values:
 *
 * - `true` (Boolean): Allow Autolinker to replace the match as it normally
 *   would.
 * - `false` (Boolean): Do not replace the current match at all - leave as-is.
 * - Any String: If a string is returned from the function, the string will be
 *   used directly as the replacement HTML for the match.
 * - An {@link Autolinker.HtmlTag} instance, which can be used to build/modify
 *   an HTML tag before writing out its HTML text.
 *
 * @constructor
 * @param {Object} [cfg] The configuration options for the Autolinker instance,
 *   specified in an Object (map).
 */
var Autolinker = function( cfg ) {
	cfg = cfg || {};

	this.urls = this.normalizeUrlsCfg( cfg.urls );
	this.email = typeof cfg.email === 'boolean' ? cfg.email : true;
	this.twitter = typeof cfg.twitter === 'boolean' ? cfg.twitter : true;
	this.phone = typeof cfg.phone === 'boolean' ? cfg.phone : true;
	this.hashtag = cfg.hashtag || false;
	this.newWindow = typeof cfg.newWindow === 'boolean' ? cfg.newWindow : true;
	this.stripPrefix = typeof cfg.stripPrefix === 'boolean' ? cfg.stripPrefix : true;

	// Validate the value of the `hashtag` cfg.
	var hashtag = this.hashtag;
	if( hashtag !== false && hashtag !== 'twitter' && hashtag !== 'facebook' && hashtag !== 'instagram' ) {
		throw new Error( "invalid `hashtag` cfg - see docs" );
	}

	this.truncate = this.normalizeTruncateCfg( cfg.truncate );
	this.className = cfg.className || '';
	this.replaceFn = cfg.replaceFn || null;

	this.htmlParser = null;
	this.matchers = null;
	this.tagBuilder = null;
};

Autolinker.prototype = {
	constructor : Autolinker,  // fix constructor property

	/**
	 * @cfg {Boolean/Object} [urls=true]
	 *
	 * `true` if URLs should be automatically linked, `false` if they should not
	 * be.
	 *
	 * This option also accepts an Object form with 3 properties, to allow for
	 * more customization of what exactly gets linked. All default to `true`:
	 *
	 * @param {Boolean} schemeMatches `true` to match URLs found prefixed with a
	 *   scheme, i.e. `http://google.com`, or `other+scheme://google.com`,
	 *   `false` to prevent these types of matches.
	 * @param {Boolean} wwwMatches `true` to match urls found prefixed with
	 *   `'www.'`, i.e. `www.google.com`. `false` to prevent these types of
	 *   matches. Note that if the URL had a prefixed scheme, and
	 *   `schemeMatches` is true, it will still be linked.
	 * @param {Boolean} tldMatches `true` to match URLs with known top level
	 *   domains (.com, .net, etc.) that are not prefixed with a scheme or
	 *   `'www.'`. This option attempts to match anything that looks like a URL
	 *   in the given text. Ex: `google.com`, `asdf.org/?page=1`, etc. `false`
	 *   to prevent these types of matches.
	 */

	/**
	 * @cfg {Boolean} [email=true]
	 *
	 * `true` if email addresses should be automatically linked, `false` if they
	 * should not be.
	 */

	/**
	 * @cfg {Boolean} [twitter=true]
	 *
	 * `true` if Twitter handles ("@example") should be automatically linked,
	 * `false` if they should not be.
	 */

	/**
	 * @cfg {Boolean} [phone=true]
	 *
	 * `true` if Phone numbers ("(555)555-5555") should be automatically linked,
	 * `false` if they should not be.
	 */

	/**
	 * @cfg {Boolean/String} [hashtag=false]
	 *
	 * A string for the service name to have hashtags (ex: "#myHashtag")
	 * auto-linked to. The currently-supported values are:
	 *
	 * - 'twitter'
	 * - 'facebook'
	 * - 'instagram'
	 *
	 * Pass `false` to skip auto-linking of hashtags.
	 */

	/**
	 * @cfg {Boolean} [newWindow=true]
	 *
	 * `true` if the links should open in a new window, `false` otherwise.
	 */

	/**
	 * @cfg {Boolean} [stripPrefix=true]
	 *
	 * `true` if 'http://' or 'https://' and/or the 'www.' should be stripped
	 * from the beginning of URL links' text, `false` otherwise.
	 */

	/**
	 * @cfg {Number/Object} truncate
	 *
	 * ## Number Form
	 *
	 * A number for how many characters matched text should be truncated to
	 * inside the text of a link. If the matched text is over this number of
	 * characters, it will be truncated to this length by adding a two period
	 * ellipsis ('..') to the end of the string.
	 *
	 * For example: A url like 'http://www.yahoo.com/some/long/path/to/a/file'
	 * truncated to 25 characters might look something like this:
	 * 'yahoo.com/some/long/pat..'
	 *
	 * Example Usage:
	 *
	 *     truncate: 25
	 *
	 *
	 * ## Object Form
	 *
	 * An Object may also be provided with two properties: `length` (Number) and
	 * `location` (String). `location` may be one of the following: 'end'
	 * (default), 'middle', or 'smart'.
	 *
	 * Example Usage:
	 *
	 *     truncate: { length: 25, location: 'middle' }
	 *
	 * @cfg {Number} truncate.length How many characters to allow before
	 *   truncation will occur.
	 * @cfg {"end"/"middle"/"smart"} [truncate.location="end"]
	 *
	 * - 'end' (default): will truncate up to the number of characters, and then
	 *   add an ellipsis at the end. Ex: 'yahoo.com/some/long/pat..'
	 * - 'middle': will truncate and add the ellipsis in the middle. Ex:
	 *   'yahoo.com/s..th/to/a/file'
	 * - 'smart': for URLs where the algorithm attempts to strip out unnecessary
	 *   parts first (such as the 'www.', then URL scheme, hash, etc.),
	 *   attempting to make the URL human-readable before looking for a good
	 *   point to insert the ellipsis if it is still too long. Ex:
	 *   'yahoo.com/some..to/a/file'. For more details, see
	 *   {@link Autolinker.truncate.TruncateSmart}.
	 */

	/**
	 * @cfg {String} className
	 *
	 * A CSS class name to add to the generated links. This class will be added
	 * to all links, as well as this class plus match suffixes for styling
	 * url/email/phone/twitter/hashtag links differently.
	 *
	 * For example, if this config is provided as "myLink", then:
	 *
	 * - URL links will have the CSS classes: "myLink myLink-url"
	 * - Email links will have the CSS classes: "myLink myLink-email", and
	 * - Twitter links will have the CSS classes: "myLink myLink-twitter"
	 * - Phone links will have the CSS classes: "myLink myLink-phone"
	 * - Hashtag links will have the CSS classes: "myLink myLink-hashtag"
	 */

	/**
	 * @cfg {Function} replaceFn
	 *
	 * A function to individually process each match found in the input string.
	 *
	 * See the class's description for usage.
	 *
	 * This function is called with the following parameters:
	 *
	 * @cfg {Autolinker} replaceFn.autolinker The Autolinker instance, which may
	 *   be used to retrieve child objects from (such as the instance's
	 *   {@link #getTagBuilder tag builder}).
	 * @cfg {Autolinker.match.Match} replaceFn.match The Match instance which
	 *   can be used to retrieve information about the match that the `replaceFn`
	 *   is currently processing. See {@link Autolinker.match.Match} subclasses
	 *   for details.
	 */


	/**
	 * @private
	 * @property {Autolinker.htmlParser.HtmlParser} htmlParser
	 *
	 * The HtmlParser instance used to skip over HTML tags, while finding text
	 * nodes to process. This is lazily instantiated in the {@link #getHtmlParser}
	 * method.
	 */

	/**
	 * @private
	 * @property {Autolinker.matcher.Matcher[]} matchers
	 *
	 * The {@link Autolinker.matcher.Matcher} instances for this Autolinker
	 * instance.
	 *
	 * This is lazily created in {@link #getMatchers}.
	 */

	/**
	 * @private
	 * @property {Autolinker.AnchorTagBuilder} tagBuilder
	 *
	 * The AnchorTagBuilder instance used to build match replacement anchor tags.
	 * Note: this is lazily instantiated in the {@link #getTagBuilder} method.
	 */


	/**
	 * Normalizes the {@link #urls} config into an Object with 3 properties:
	 * `schemeMatches`, `wwwMatches`, and `tldMatches`, all Booleans.
	 *
	 * See {@link #urls} config for details.
	 *
	 * @private
	 * @param {Boolean/Object} urls
	 * @return {Object}
	 */
	normalizeUrlsCfg : function( urls ) {
		if( urls == null ) urls = true;  // default to `true`

		if( typeof urls === 'boolean' ) {
			return { schemeMatches: urls, wwwMatches: urls, tldMatches: urls };

		} else {  // object form
			return {
				schemeMatches : typeof urls.schemeMatches === 'boolean' ? urls.schemeMatches : true,
				wwwMatches    : typeof urls.wwwMatches === 'boolean'    ? urls.wwwMatches    : true,
				tldMatches    : typeof urls.tldMatches === 'boolean'    ? urls.tldMatches    : true
			};
		}
	},


	/**
	 * Normalizes the {@link #truncate} config into an Object with 2 properties:
	 * `length` (Number), and `location` (String).
	 *
	 * See {@link #truncate} config for details.
	 *
	 * @private
	 * @param {Number/Object} truncate
	 * @return {Object}
	 */
	normalizeTruncateCfg : function( truncate ) {
		if( typeof truncate === 'number' ) {
			return { length: truncate, location: 'end' };

		} else {  // object, or undefined/null
			return Autolinker.Util.defaults( truncate || {}, {
				length   : Number.POSITIVE_INFINITY,
				location : 'end'
			} );
		}
	},


	/**
	 * Parses the input `textOrHtml` looking for URLs, email addresses, phone
	 * numbers, username handles, and hashtags (depending on the configuration
	 * of the Autolinker instance), and returns an array of {@link Autolinker.match.Match}
	 * objects describing those matches.
	 *
	 * This method is used by the {@link #link} method, but can also be used to
	 * simply do parsing of the input in order to discover what kinds of links
	 * there are and how many.
	 *
	 * @param {String} textOrHtml The HTML or text to find matches within
	 *   (depending on if the {@link #urls}, {@link #email}, {@link #phone},
	 *   {@link #twitter}, and {@link #hashtag} options are enabled).
	 * @return {Autolinker.match.Match[]} The array of Matches found in the
	 *   given input `textOrHtml`.
	 */
	parse : function( textOrHtml ) {
		var htmlParser = this.getHtmlParser(),
		    htmlNodes = htmlParser.parse( textOrHtml ),
		    anchorTagStackCount = 0,  // used to only process text around anchor tags, and any inner text/html they may have;
		    matches = [];

		// Find all matches within the `textOrHtml` (but not matches that are
		// already nested within <a> tags)
		for( var i = 0, len = htmlNodes.length; i < len; i++ ) {
			var node = htmlNodes[ i ],
			    nodeType = node.getType();

			if( nodeType === 'element' && node.getTagName() === 'a' ) {  // Process HTML anchor element nodes in the input `textOrHtml` to find out when we're within an <a> tag
				if( !node.isClosing() ) {  // it's the start <a> tag
					anchorTagStackCount++;
				} else {  // it's the end </a> tag
					anchorTagStackCount = Math.max( anchorTagStackCount - 1, 0 );  // attempt to handle extraneous </a> tags by making sure the stack count never goes below 0
				}

			} else if( nodeType === 'text' && anchorTagStackCount === 0 ) {  // Process text nodes that are not within an <a> tag
				var textNodeMatches = this.parseText( node.getText(), node.getOffset() );

				matches.push.apply( matches, textNodeMatches );
			}
		}


		// After we have found all matches, remove subsequent matches that
		// overlap with a previous match. This can happen for instance with URLs,
		// where the url 'google.com/#link' would match '#link' as a hashtag.
		matches = this.compactMatches( matches );

		// And finally, remove matches for match types that have been turned
		// off. We needed to have all match types turned on initially so that
		// things like hashtags could be filtered out if they were really just
		// part of a URL match (as a named anchor).
		if( !this.hashtag ) matches = matches.filter( function( match ) { return match.getType() !== 'hashtag'; } );
		if( !this.email )   matches = matches.filter( function( match ) { return match.getType() !== 'email'; } );
		if( !this.phone )   matches = matches.filter( function( match ) { return match.getType() !== 'phone'; } );
		if( !this.twitter ) matches = matches.filter( function( match ) { return match.getType() !== 'twitter'; } );
		if( !this.urls.schemeMatches ) {
			matches = matches.filter( function( m ) { return m.getType() !== 'url' || m.getUrlMatchType() !== 'scheme'; } );
		}
		if( !this.urls.wwwMatches ) {
			matches = matches.filter( function( m ) { return m.getType() !== 'url' || m.getUrlMatchType() !== 'www'; } );
		}
		if( !this.urls.tldMatches ) {
			matches = matches.filter( function( m ) { return m.getType() !== 'url' || m.getUrlMatchType() !== 'tld'; } );
		}

		return matches;
	},


	/**
	 * After we have found all matches, we need to remove subsequent matches
	 * that overlap with a previous match. This can happen for instance with
	 * URLs, where the url 'google.com/#link' would match '#link' as a hashtag.
	 *
	 * @private
	 * @param {Autolinker.match.Match[]} matches
	 * @return {Autolinker.match.Match[]}
	 */
	compactMatches : function( matches ) {
		// First, the matches need to be sorted in order of offset
		matches.sort( function( a, b ) { return a.getOffset() - b.getOffset(); } );

		for( var i = 0; i < matches.length - 1; i++ ) {
			var match = matches[ i ],
			    endIdx = match.getOffset() + match.getMatchedText().length;

			// Remove subsequent matches that overlap with the current match
			while( i + 1 < matches.length && matches[ i + 1 ].getOffset() <= endIdx ) {
				matches.splice( i + 1, 1 );
			}
		}

		return matches;
	},


	/**
	 * Parses the input `text` looking for URLs, email addresses, phone
	 * numbers, username handles, and hashtags (depending on the configuration
	 * of the Autolinker instance), and returns an array of {@link Autolinker.match.Match}
	 * objects describing those matches.
	 *
	 * This method processes a **non-HTML string**, and is used to parse and
	 * match within the text nodes of an HTML string. This method is used
	 * internally by {@link #parse}.
	 *
	 * @private
	 * @param {String} text The text to find matches within (depending on if the
	 *   {@link #urls}, {@link #email}, {@link #phone}, {@link #twitter}, and
	 *   {@link #hashtag} options are enabled). This must be a non-HTML string.
	 * @param {Number} [offset=0] The offset of the text node within the
	 *   original string. This is used when parsing with the {@link #parse}
	 *   method to generate correct offsets within the {@link Autolinker.match.Match}
	 *   instances, but may be omitted if calling this method publicly.
	 * @return {Autolinker.match.Match[]} The array of Matches found in the
	 *   given input `text`.
	 */
	parseText : function( text, offset ) {
		offset = offset || 0;
		var matchers = this.getMatchers(),
		    matches = [];

		for( var i = 0, numMatchers = matchers.length; i < numMatchers; i++ ) {
			var textMatches = matchers[ i ].parseMatches( text );

			// Correct the offset of each of the matches. They are originally
			// the offset of the match within the provided text node, but we
			// need to correct them to be relative to the original HTML input
			// string (i.e. the one provided to #parse).
			for( var j = 0, numTextMatches = textMatches.length; j < numTextMatches; j++ ) {
				textMatches[ j ].setOffset( offset + textMatches[ j ].getOffset() );
			}

			matches.push.apply( matches, textMatches );
		}
		return matches;
	},


	/**
	 * Automatically links URLs, Email addresses, Phone numbers, Twitter
	 * handles, and Hashtags found in the given chunk of HTML. Does not link
	 * URLs found within HTML tags.
	 *
	 * For instance, if given the text: `You should go to http://www.yahoo.com`,
	 * then the result will be `You should go to
	 * &lt;a href="http://www.yahoo.com"&gt;http://www.yahoo.com&lt;/a&gt;`
	 *
	 * This method finds the text around any HTML elements in the input
	 * `textOrHtml`, which will be the text that is processed. Any original HTML
	 * elements will be left as-is, as well as the text that is already wrapped
	 * in anchor (&lt;a&gt;) tags.
	 *
	 * @param {String} textOrHtml The HTML or text to autolink matches within
	 *   (depending on if the {@link #urls}, {@link #email}, {@link #phone},
	 *   {@link #twitter}, and {@link #hashtag} options are enabled).
	 * @return {String} The HTML, with matches automatically linked.
	 */
	link : function( textOrHtml ) {
		if( !textOrHtml ) { return ""; }  // handle `null` and `undefined`

		var matches = this.parse( textOrHtml ),
			newHtml = [],
			lastIndex = 0;

		for( var i = 0, len = matches.length; i < len; i++ ) {
			var match = matches[ i ];

			newHtml.push( textOrHtml.substring( lastIndex, match.getOffset() ) );
			newHtml.push( this.createMatchReturnVal( match ) );

			lastIndex = match.getOffset() + match.getMatchedText().length;
		}
		newHtml.push( textOrHtml.substring( lastIndex ) );  // handle the text after the last match

		return newHtml.join( '' );
	},


	/**
	 * Creates the return string value for a given match in the input string.
	 *
	 * This method handles the {@link #replaceFn}, if one was provided.
	 *
	 * @private
	 * @param {Autolinker.match.Match} match The Match object that represents
	 *   the match.
	 * @return {String} The string that the `match` should be replaced with.
	 *   This is usually the anchor tag string, but may be the `matchStr` itself
	 *   if the match is not to be replaced.
	 */
	createMatchReturnVal : function( match ) {
		// Handle a custom `replaceFn` being provided
		var replaceFnResult;
		if( this.replaceFn ) {
			replaceFnResult = this.replaceFn.call( this, this, match );  // Autolinker instance is the context, and the first arg
		}

		if( typeof replaceFnResult === 'string' ) {
			return replaceFnResult;  // `replaceFn` returned a string, use that

		} else if( replaceFnResult === false ) {
			return match.getMatchedText();  // no replacement for the match

		} else if( replaceFnResult instanceof Autolinker.HtmlTag ) {
			return replaceFnResult.toAnchorString();

		} else {  // replaceFnResult === true, or no/unknown return value from function
			// Perform Autolinker's default anchor tag generation
			var tagBuilder = this.getTagBuilder(),
			    anchorTag = tagBuilder.build( match );  // returns an Autolinker.HtmlTag instance

			return anchorTag.toAnchorString();
		}
	},


	/**
	 * Lazily instantiates and returns the {@link #htmlParser} instance for this
	 * Autolinker instance.
	 *
	 * @protected
	 * @return {Autolinker.htmlParser.HtmlParser}
	 */
	getHtmlParser : function() {
		var htmlParser = this.htmlParser;

		if( !htmlParser ) {
			htmlParser = this.htmlParser = new Autolinker.htmlParser.HtmlParser();
		}

		return htmlParser;
	},


	/**
	 * Lazily instantiates and returns the {@link Autolinker.matcher.Matcher}
	 * instances for this Autolinker instance.
	 *
	 * @protected
	 * @return {Autolinker.matcher.Matcher[]}
	 */
	getMatchers : function() {
		if( !this.matchers ) {
			var matchersNs = Autolinker.matcher;
			var matchers = [
				new matchersNs.Hashtag( { serviceName: this.hashtag } ),
				new matchersNs.Email(),
				new matchersNs.Phone(),
				new matchersNs.Twitter(),
				new matchersNs.Url( { stripPrefix: this.stripPrefix } )
			];

			return ( this.matchers = matchers );

		} else {
			return this.matchers;
		}
	},


	/**
	 * Returns the {@link #tagBuilder} instance for this Autolinker instance, lazily instantiating it
	 * if it does not yet exist.
	 *
	 * This method may be used in a {@link #replaceFn} to generate the {@link Autolinker.HtmlTag HtmlTag} instance that
	 * Autolinker would normally generate, and then allow for modifications before returning it. For example:
	 *
	 *     var html = Autolinker.link( "Test google.com", {
	 *         replaceFn : function( autolinker, match ) {
	 *             var tag = autolinker.getTagBuilder().build( match );  // returns an {@link Autolinker.HtmlTag} instance
	 *             tag.setAttr( 'rel', 'nofollow' );
	 *
	 *             return tag;
	 *         }
	 *     } );
	 *
	 *     // generated html:
	 *     //   Test <a href="http://google.com" target="_blank" rel="nofollow">google.com</a>
	 *
	 * @return {Autolinker.AnchorTagBuilder}
	 */
	getTagBuilder : function() {
		var tagBuilder = this.tagBuilder;

		if( !tagBuilder ) {
			tagBuilder = this.tagBuilder = new Autolinker.AnchorTagBuilder( {
				newWindow   : this.newWindow,
				truncate    : this.truncate,
				className   : this.className
			} );
		}

		return tagBuilder;
	}

};


/**
 * Automatically links URLs, Email addresses, Phone Numbers, Twitter handles,
 * and Hashtags found in the given chunk of HTML. Does not link URLs found
 * within HTML tags.
 *
 * For instance, if given the text: `You should go to http://www.yahoo.com`,
 * then the result will be `You should go to &lt;a href="http://www.yahoo.com"&gt;http://www.yahoo.com&lt;/a&gt;`
 *
 * Example:
 *
 *     var linkedText = Autolinker.link( "Go to google.com", { newWindow: false } );
 *     // Produces: "Go to <a href="http://google.com">google.com</a>"
 *
 * @static
 * @param {String} textOrHtml The HTML or text to find matches within (depending
 *   on if the {@link #urls}, {@link #email}, {@link #phone}, {@link #twitter},
 *   and {@link #hashtag} options are enabled).
 * @param {Object} [options] Any of the configuration options for the Autolinker
 *   class, specified in an Object (map). See the class description for an
 *   example call.
 * @return {String} The HTML text, with matches automatically linked.
 */
Autolinker.link = function( textOrHtml, options ) {
	var autolinker = new Autolinker( options );
	return autolinker.link( textOrHtml );
};


// Autolinker Namespaces

Autolinker.match = {};
Autolinker.matcher = {};
Autolinker.htmlParser = {};
Autolinker.truncate = {};
