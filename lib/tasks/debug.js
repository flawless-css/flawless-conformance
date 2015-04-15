
import chalk from 'chalk';
import core from 'core-js/library';

import { PARSE } from 'ho-conformance-events';


export default class Debug {
    constructor() {
        this.bindHandlers()

        this.taskName = 'Debug'
        this.runner = null
    }

    bindHandlers() {
        // Bind up any methods starting with 'on'
        Object.getOwnPropertyNames( this.__proto__ )
            .filter( key => {
                return /^on/.test( key )
            })
            .forEach( key => {
                this[ key ] = this[ key ].bind( this )
            })
    }

    install( opts ) {
        if ( !opts || !opts.runner ) {
            throw new Error( 'Debug class requires an instance of the conformance runner' )
        }

        this.runner = opts.runner;

        this.runner.on( PARSE.ROOT, this.onRoot )
        this.runner.on( PARSE.RULE, this.onRule )
        this.runner.on( PARSE.RULESET, this.onRuleset )
        this.runner.on( PARSE.SELECTOR, this.onSelector )
        this.runner.on( PARSE.VARIABLE, this.onVariable )
    }

    destroy() {
        this.runner.off( PARSE.ROOT, this.onRoot )
        this.runner.off( PARSE.RULE, this.onRule )
        this.runner.off( PARSE.RULESET, this.onRuleset )
        this.runner.off( PARSE.SELECTOR, this.onSelector )
        this.runner.off( PARSE.VARIABLE, this.onVariable )

        this.runner = null;
    }


    /*-----------------------------------------------------------*\
     *
     *  Listeners
     *
    \*-----------------------------------------------------------*/

    onRoot( root ) {
        console.log( '[Debug]', chalk.cyan( root.name ) )
    }

    onRule( rule ) {
        console.log( '[Debug]', chalk.grey( 'names' ), rule.name )
        console.log( '[Debug]', chalk.grey( 'value' ), rule.value )
    }

    onRuleset( rule ) {
        console.log( '' )

        try {
            var rulesets = rule.raw.rulesets()
            var variables = core.Object.entries( rule.raw.variables() )
            var rules = rule.raw.rules.filter( r => {
                return !r.variable
            })
            console.log( '[Debug]', 'number of immediate sub-rules:', rulesets.length )
            console.log( '[Debug]', 'number of variables:', variables.length )
            console.log( '[Debug]', 'number of rules:', rules.length )
        } catch( err ) {
            console.error( 'error calculating number of rules and variables' )
        }
    }

    onSelector( element ) {
        console.log( '[Debug]', chalk.yellow( element.name ) )
    }

    onVariable( variable ) {
        console.log( '[Debug]', chalk.magenta( 'v' ), chalk.grey( 'name' ), variable.name )
        console.log( '[Debug]', chalk.magenta( 'v' ), chalk.grey( 'values' ), variable.value )
    }
}
