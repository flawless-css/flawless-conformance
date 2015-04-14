
import path from 'path';
import less from 'less';
import chalk from 'chalk';
import core from 'core-js/library';


/**
 * Conformance
 * Manages running parsing the less and running tasks to check
 * for various aspects of it
 * @class
 */
export default class Conformance {
    /**
     * @constructs
     * @param opts <Object>
     *   @param paths <Array:String> import paths for less
     *   @param entry <String> main entry file for less
     */
    constructor( opts ) {
        this.opts = core.Object.assign({
            paths: [
                './node_modules'
            ],
            entry: 'input'
        }, opts )
    }


    /**
     * parse
     * Runs the less parser and evaluates the AST
     */
    parse( css ) {
        less.parse( css, {
            paths: this.opts.paths,
            filename: this.opts.entry
        }, ( err, root, imports ) => {
            if ( err ) {
                return console.error( err )
            }

            // Generate parseTree
            // var parseTree = new less.ParseTree( root, imports )
            // console.log( parseTree.toCSS( {} ) )

            // Process root node as a root
            // Some roots will not have any rulesets
            if ( root.rulesets().length ) {
                this._processRoot( root, path.basename( this.opts.entry ) )
            }

            // Process import files
            // It is possible these wont have rulesets as well
            var keys = Object.keys( imports.files )
            if ( keys.length ) {
                keys
                    .map( key => {
                        return [
                            imports.files[ key ],
                            path.basename( key )
                        ]
                    })
                    .forEach( file => {
                        this._processRoot( ...file )
                    })
            }
        })
    }

    _processRoot( root, filepath ) {
        console.log( chalk.cyan( filepath ), chalk.grey( '-- Rulesets' ), root.rulesets().length )

        // Process root variables
        var variables = core.Object.entries( root.variables() )
        console.log( 'number of variables:', variables.length )
        variables.forEach( variable => {
            this._renderVariable({
                name: variable[ 0 ],
                value: variable[ 1 ].value
            })
        })

        console.log( '' )

        // Handle each ruleset
        root.rulesets().forEach( this._processRuleset.bind( this ) )

    }

    _getRuleValue( rule ) {
        var tmp = rule
        // Recurse looking for leaf node
        while( tmp.value ) {
            // A string probably denotes a leaf node
            if ( typeof tmp.value === 'string' && tmp.type.toLowerCase() === 'anonymous' ) {
                break
            }
            tmp = tmp.value[ 0 ] || tmp.value
        }
        return tmp.name || tmp.value
    }

    _processRuleset( ruleset ) {
        ruleset.selectors.forEach( selector => {
            selector.elements.forEach( element => {
                console.log( chalk.yellow( element.value ) )
            })
        })
        console.log( 'number of rules:', ruleset.rules.length )
        ruleset.rules.forEach( this._processRule.bind( this ) )

        console.log( '' )
    }

    _processRule( rule ) {
        return rule.variable ? this._renderVariable( rule ) : this._renderRule( rule )
    }

    _renderRule( rule ) {
        console.log( chalk.grey( 'names' ), rule.name.map( name => {
            return name.value
        }).join( ', '))
        console.log( chalk.grey( 'values' ), this._getRuleValue( rule ) )
    }

    _renderVariable( rule ) {
        console.log( chalk.grey( 'name' ), rule.name )
        console.log( chalk.grey( 'values' ), rule.value.toCSS() )
    }
}
