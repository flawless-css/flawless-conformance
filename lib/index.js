
import path from 'path';
import less from 'less';
import chalk from 'chalk';
import core from 'core-js/library';


export default class Conformance {
    constructor( opts ) {
        this.opts = core.Object.assign({
            paths: [
                './node_modules'
            ],
            entry: 'input'
        }, opts )
    }

    parse( css ) {
        less.parse( css, {
            paths: this.opts.paths,
            filename: this.opts.entry
        // err, root, imports, options
        }, ( err, root, imports ) => {
            if ( err ) {
                return console.error( err )
            }

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
        console.log( chalk.cyan( filepath ), chalk.grey( '--  Rulesets' ), root.rulesets().length )

        // Apart from rulesets, root can also have variables
        var variables = core.Object.entries( root.variables() )
        console.log( 'number of variables:', variables.length )

        variables.forEach( variable => {
            console.log( chalk.grey( 'name' ), variable[ 0 ] )
            console.log( chalk.grey( 'value' ), variable[ 1 ].value.toCSS() )
        })

        console.log( '' )

        // Handle each ruleset
        root.rulesets().forEach( ruleset => {
            ruleset.selectors.forEach( selector => {
                selector.elements.forEach( element => {
                    console.log( chalk.yellow( element.value ) )
                })
            })
            console.log( 'number of rules:', ruleset.rules.length )
            ruleset.rules.forEach( rule => {
                // Names is an array of objects, so get all their values and join them together
                console.log( chalk.grey( 'names' ), rule.name.map( name => {
                    return name.value
                }).join( ', '))
                // Values are objects, but not an array of them, so just whack out their value
                console.log( chalk.grey( 'values' ), this._getRuleValue( rule ) )
            })

            console.log( '' )
        })

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
}
