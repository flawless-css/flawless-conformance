
import chalk from 'chalk';
import core from 'core-js/library';
import { PARSE } from '../events';


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
        // this.onRule = this.onRule.bind( this )
        // this.onRuleset = this.onRuleset.bind( this )

        Object.keys( this )
            .filter( key => {
                return /^on/.test( key )
            })
            .forEach( key => {
                this[ key ] = this[ key ].bind( this )
            })
    }

    install() {
        console.log( 'Registering', this.className )

        this.runner.on( PARSE.RULE, this.onRule )
        this.runner.on( PARSE.RULESET, this.onRuleset )
        this.runner.on( PARSE.SELECTOR, this.onSelector )
        this.runner.on( PARSE.VARIABLE, this.onVariable )
    }


    /*-----------------------------------------------------------*\
     *
     *  Listeners
     *
    \*-----------------------------------------------------------*/

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
            console.log( 'number of immediate sub-rules:', rulesets.length )
            console.log( 'number of variables:', variables.length )
            console.log( 'number of rules:', rules.length )
        } catch( err ) {
            console.error( 'error calculating number of rules and variables' )
        }
    }

    onSelector( element ) {
        console.log( chalk.yellow( element.name ) )
    }

    onVariable( variable ) {
        console.log( '[Debug]', chalk.magenta( 'v' ), chalk.grey( 'name' ), variable.name )
        console.log( '[Debug]', chalk.magenta( 'v' ), chalk.grey( 'values' ), variable.value )
    }
}
