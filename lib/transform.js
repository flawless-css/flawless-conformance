import stream from 'stream';

/**
 * Transformer
 * @class
 * Only to be used with the Conformance class
 */
export default class Transformer extends stream.Transform {
    constructor() {
        super()
    }

    /**
     * _transform
     * Collects input
     * @private
     */
    _transform( chunk, enc, next ) {
        if ( chunk !== null ) {
            this.input += chunk
        }

        // Stream straight through if in stream mode and not in compile mode
        // --compile will output compiled css, which needs to wait for all data
        //   and output during the flush
        // --suppress-streaming will stop output passing through conformance transform
        //   which is more useful when sending other stuff (often during debugging)
        //   to stdout
        if ( this.opts.streaming && !this.opts.compiling ) {
            this.push( chunk )
        }

        next()
    }

    /**
     * _flush
     * Called when input has been collected
     */
    _flush( done ) {
        this.parse( this.input, ( err, res ) => {
            if ( err ) {
                this.emit( 'error', err )
                this.emit( 'complete' )
                done()
            }
            
            if ( this.opts.compiling ) {
                this.push( res.css )
            }

            this.emit( 'complete' )
            done()
        })
    }

}
