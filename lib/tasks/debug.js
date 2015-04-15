
import core from 'core-js/library';

export default class Debug {
    constructor( opts ) {
        if ( !opts ) {
            throw new Error( 'Debug class requires instantiation options' )
        }

        if ( !opts.runner ) {
            throw new Error( 'Debug class requires an instance of the conformance runner' )
        }

        this.bindHandlers()

        this.className = 'Debug'

        this.opts = core.Object.assign({
            runner: null
        }, opts )

        this.runner = this.opts.runner
    }

    bindHandlers() {
        this.onRule = this.onRule.bind( this )
    }

    install() {
        console.log( 'Registering', this.className )

        this.runner.on( 'rule', this.onRule )
    }


    /*-----------------------------------------------------------*\
     *
     *  Listeners
     *
    \*-----------------------------------------------------------*/
    onRule( rule ) {
        console.log( '[Debug]', rule )
    }


}
