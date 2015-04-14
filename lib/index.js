
import path from 'path';
import fs from 'fs';
import less from 'less';
import chalk from 'chalk';
import core from 'core-js/library/es6/object';


var entryPath = path.join( __dirname, '../spec' )
var entry = path.join( entryPath, 'index.less' )


export default class Conformance {
    constructor( opts ) {
        this.opts = core.assign({
            paths: [
                './node_modules'
            ],
            entry: opts.entry
        }, opts )
    }

    debugTree() {
        less.parse( fs.readFileSync( this.opts.entry, {
            encoding: 'utf8'
        }), {
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
                this._processRoot( root, path.basename( entry ) )
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
                console.log( chalk.grey( 'values' ), rule.value.value )
            })

            console.log( '' )
        })
    }
}
