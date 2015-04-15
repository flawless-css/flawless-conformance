
import path from 'path';
import less from 'less';
import chalk from 'chalk';
import core from 'core-js/library';

import Transformer from './transform';
import DebugTask from './tasks/debug';

/**
 * Conformance
 * Manages running parsing the less and running tasks to check
 * for various aspects of it
 * @class
 */
export default class Conformance extends Transformer {
    /**
     * @constructs
     * @param opts <Object>
     *   @param paths <Array:String> import paths for less
     *   @param entry <String> main entry file for less
     */
    constructor( opts ) {
        super()

        this.opts = core.Object.assign({
            paths: [
                './node_modules'
            ],
            entry: 'input',
            output: false,
            streaming: true
        }, opts )

        this.input = ''

        this.tasks = []

        // @TODO remove, should be done by the consumer
        this.register( DebugTask )
    }

    /**
     * Registers a task
     * Pass it a class, it’ll be instantiated with options during the registration
     * @param Task <Task> @TODO create Task abstract class
     */
    register( Task ) {
        var task = new Task({
            runner: this
        })
        this.tasks.push( task )
        task.install()
    }

    /**
     * parse
     * Runs the less parser and evaluates the AST
     * @param css <String> the string to less to evaluate
     */
    parse( css, callback ) {
        less.parse( css, {
            paths: this.opts.paths,
            filename: this.opts.entry
        }, ( err, root, imports ) => {
            if ( err ) {
                return console.error( err )
            }

            // Process root node as a root
            // Doesnt matter if it doesnt have any rulesets
            this._processRoot( root )

            // Process import files
            // These may not have rulesets either
            Object.keys( imports.files ).forEach( filename => {
                this._processRoot( imports.files[ filename ] )
            })


            // Generate parseTree
            var parseTree = new less.ParseTree( root, imports )
            var parsed = parseTree.toCSS( {} ).css

            if ( this.opts.output ) {
                console.log( parsed )
            }

            // @TODO strict conformance should throw an error here on failure
            callback( null, {
                raw: css,
                css: parsed
            })
        })
    }

    /**
     * Walks a root file object
     * @private
     * @param root <Object> base object for a file
     */
    _processRoot( root ) {
        console.log( '' )
        console.log( chalk.cyan( this._getFileName( root ) ) )

        this._processRuleset( root )
    }

    /**
     * Walks ruleset object
     * @private
     * @param ruleset <RuleSet>
     */
    _processRuleset( ruleset ) {
        if ( ruleset.selectors ) {
            console.log( '' )
            ruleset.selectors.forEach( selector => {
                selector.elements.forEach( element => {
                    console.log( chalk.yellow( element.value ) )
                })
            })
        }

        try {
            var rulesets = ruleset.rulesets()
            var variables = core.Object.entries( ruleset.variables() )
            var rules = ruleset.rules.filter( rule => {
                return !rule.variable
            })
            console.log( 'number of immediate sub-rules:', rulesets.length )
            console.log( 'number of variables:', variables.length )
            console.log( 'number of rules:', rules.length )
        } catch( err ) {
            console.error( 'error calculating number of rules and variables' )
        }
        ruleset.rules.forEach( this._processRule.bind( this ) )
    }

    /**
     * Walks over a rule object
     * @private
     * @param rule <Rule>
     */
    _processRule( rule ) {
        // this.emit( 'rule', rule )

        // Ignore import rules
        if ( rule.type === 'Import' ) {
            return
        }

        // Check for nesting
        if ( rule.isRuleset ) {
            this._processRuleset( rule )
            return
        }

        // Check for variable definition
        if ( rule.variable ) {
            this._processVariableRule( rule )
            return
        }


        // Regular ole CSS rule (although value could be a variable :) )
        console.log( chalk.blue( 'r' ), chalk.grey( 'names' ), rule.name.map( name => {
            return name.value
        }).join( ', '))
        console.log( chalk.blue( 'r' ), chalk.grey( 'values' ), this._getRuleValue( rule ) )
    }


    /**
     * Walks over a variable rule object
     * @private
     * @param rule <Rule>
     */
    _processVariableRule( rule ) {
        console.log( chalk.magenta( 'v' ), chalk.grey( 'name' ), rule.name )
        console.log( chalk.magenta( 'v' ), chalk.grey( 'values' ), rule.value.toCSS() )
    }

    /**
     * Recurses rule value object looking for actual output
     * Only looks at the first side of the B-tree
     * @private
     * @param rule <Rule>
     */
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


    /**
     * In theory this grabs the file name, I dont like it much though
     * @private
     * @param ruleset <Ruleset>
     */
    _getFileName( ruleset ) {
        try {
            return ruleset.rules[ 0 ].currentFileInfo.filename
        } catch( err ) {
            // Try some dirty recursing through the first side of the tree looking for a valid leaf with info
            var tmp = ruleset
            while( !tmp.currentFileInfo ) {
                try {
                    // In theory we should always hit the exit clause before this throws
                    tmp = tmp.rules[ 0 ]
                } catch( err ) {
                    tmp = null
                    break;
                }
            }
            return tmp ? tmp.currentFileInfo.filename : 'error getting filename'
        }
    }
}
