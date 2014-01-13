var request = require( 'request' );

var threads = 10;
var renderingTimeout = 5 * 60; // 5 minutes

for ( var i = 0; i < threads; i++ ) {
	runThread( i );
}

function runThread( id ) {
	var baseUrl = 'http://en.wikipedia.org/';

	var log = function( msg ) {
		console.log( '[' + id + '] ' + msg );
	};

	var get = function( url, query, callback, json ) {
		var options = {
			url: baseUrl + url,
			qs: query,
			headers: {
				'User-Agent': "MaxSem's hellish load tester"
			}
		};
		if ( json ) {
			options.json = true;
		}
		request( options, function( error, response, body ) {
			if ( error ) {
				log( 'Error while making a request to ' + options.url + ': ' + error );
			}
			callback( error, response, body );
		} );
	};

	var api = function( query, callback ) {
		query.format = 'json';
		get( 'w/api.php', query, callback, true );
	};

	var testPage = function( title ) {
		log( 'Attempting to render page ' + title );

		var startTime = process.uptime();
		// https://en.wikipedia.org/w/index.php?title=Special:Book&bookcmd=render_article&arttitle=Operation+Cobra&oldid=581927656&writer=rl
		var query = {
			title: 'Special:Book',
			bookcmd: 'render_article',
			arttitle: title,
			writer: 'rl'
		};
		var doTest = function() {
			// https://en.wikipedia.org/w/index.php?title=Special:Book&bookcmd=download&collection_id=7d167509c3b51e92&writer=rl&return_to=Operation+Cobra
			if ( process.uptime() - startTime > renderingTimeout ) {
				log( 'Page ' + title + ' timed out' );
				generateRandomPdf();
			}
			get(
				'w/index.php',
				query,
				function( err, res, body ) {
					if ( err ) {
						generateRandomPdf();
					} else if ( body.indexOf( 'bookcmd=download&amp;collection_id' ) > 0 ) {
						log( 'Download link found, proceeding' );
						generateRandomPdf();
					} else {
						setTimeout( doTest, 2000 );
					}
				}
			);
		};

		doTest();
	};

	var generateRandomPdf = function() {
		log( 'Requesting a random page...' );
		api(
			{
				action: 'query',
				list: 'random',
				rnlimit: 1,
				rnnamespace: 0
			},
			function( err, res, body ) {
				if ( !err ) {
					if ( body.query && body.query.random ) {
						testPage( body.query.random[0].title );
						return;
					} else {
						console.log(body);
						process.exit( 1 );
					}
				}
				generateRandomPdf();
			}
		);
	};

	generateRandomPdf();
}
