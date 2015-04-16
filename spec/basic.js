var fs = require( 'fs' )

var test = require( 'tape' )

var Conformance = require( '../dist')
var PARSE = require( 'ho-conformance-events' ).PARSE



function makeConformance( opts ) {
    return new Conformance( opts )
        .on( 'error', function( err ) {
            console.log( err )
        })
}


test( 'Parsing a simple element', function( t ) {
    t.plan( 3 )

    var pathname = __dirname + '/fixtures/basic.less'
    var conformance = makeConformance({
        entry: pathname
    })
        .on( 'readable', function() {
            this.__results = []
        })
        .on( PARSE.RULE, function( rule ) {
            this.__results.push( rule )
        })
        .on( 'complete', function() {
            checkResults( this.__results )
        })

    fs.createReadStream( pathname )
        .pipe( conformance )

    function checkResults( res ) {
        t.equal( res[ 0 ].name, 'color', 'Rule name should be Color' )
        t.equal( res[ 0 ].value, 'blue', 'Rule value should be Blue' )
        t.equal( res[ 0 ].raw.type, 'Rule', 'Rule type should be a base Rule object' )
    }
})
