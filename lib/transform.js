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

        if ( this.opts.streaming ) {
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
                done()
            }
            // this.push( res.raw )
            done()
        })
    }

}
