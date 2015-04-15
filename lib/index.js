
import path from 'path';
import less from 'less';
import chalk from 'chalk';
import core from 'core-js/library';

import { PARSE } from 'ho-conformance-events';

import Transformer from './transform';

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
    }

    /**
     * Registers a task
     * Pass it a class, it’ll be instantiated with options during the registration
     * @param Task <Task> @TODO create Task abstract class
     */
    register( task ) {
        console.error( 'Registering', task.taskName )
        this.tasks.push( task )
        task.install({
            runner: this
        })
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

    /*-----------------------------------------------------------*\
     *
     *  Process functions
     *
     *  Walks the AST emitting for all task watchers
     *  _Still not convinced this is the best approach_
     *
    \*-----------------------------------------------------------*/

    /**
     * Walks a root file object
     * @private
     * @param root <Object> base object for a file
     */
    _processRoot( root ) {
        this.emit( PARSE.ROOT, {
            name: this._getFilename( root ),
            raw: root
        })

        this._processRuleset( root )
    }

    /**
     * Walks ruleset object
     * @private
     * @param ruleset <RuleSet>
     */
    _processRuleset( ruleset ) {
        this.emit( PARSE.RULESET, {
            raw: ruleset
        })

        if ( ruleset.selectors ) {
            ruleset.selectors.forEach( selector => {
                this.emit( PARSE.SELECTORS, {
                    raw: selector
                })

                selector.elements.forEach( element => {
                    this.emit( PARSE.SELECTOR, {
                        name: element.value,
                        raw: element
                    })
                })
            })
        }

        ruleset.rules.forEach( this._processRule.bind( this ) )
    }

    /**
     * Walks over a rule object
     * @private
     * @param rule <Rule>
     */
    _processRule( rule ) {
        // Ignore import rules
        if ( rule.type === 'Import' ) {
            this.emit( PARSE.IMPORT, {
                raw: rule
            })
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
        this.emit( PARSE.RULE, {
            name: rule.name.map( name => {
                return name.value
            }).join( ', '),
            value: this._getRuleValue( rule ),
            raw: rule
        })
    }


    /**
     * Walks over a variable rule object
     * @private
     * @param rule <Rule>
     */
    _processVariableRule( rule ) {
        this.emit( PARSE.VARIABLE, {
            name: rule.name,
            value: rule.value.toCSS(),
            raw: rule
        })
    }

    /*-----------------------------------------------------------*\
     *
     *  Helpers
     *
    \*-----------------------------------------------------------*/

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

        // Hack in something for operators
        // @TODO
        if ( tmp.type.toLowerCase() === 'operation' ) {
            return tmp.operands[ 0 ].name + tmp.toCSS()
        }

        return tmp.name || tmp.value
    }


    /**
     * In theory this grabs the file name, I dont like it much though
     * @private
     * @param ruleset <Ruleset>
     */
    _getFilename( ruleset ) {
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
