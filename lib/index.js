
import path from 'path';
import less from 'less';
import chalk from 'chalk';
import core from 'core-js/library';

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
            this._processRoot( path.basename( this.opts.entry ), root )

            // Process import files
            // These may not have rulesets either
            core.Object.entries( imports.files )
                .forEach( file => {
                    this._processRoot( ...file )
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
     * @param filepath <String> path of file being parsed
     * @param root <Object> base object for a file
     */
    _processRoot( filepath, root ) {
        console.log( chalk.cyan( filepath ), chalk.grey( '-- Rulesets' ), root.rulesets().length )

        // Process root variables
        var variables = core.Object.entries( root.variables() )
        console.log( 'number of variables:', variables.length )
        variables.forEach( variable => {
            this._processVariableRule({
                name: variable[ 0 ],
                value: variable[ 1 ].value
            })
        })

        console.log( '' )

        // Handle each ruleset
        root.rulesets().forEach( ruleset => {
            this._processRuleset( ruleset )
            console.log( '' )
        })
    }

    /**
     * Walks ruleset object
     * @private
     * @param ruleset <RuleSet>
     */
    _processRuleset( ruleset ) {
        ruleset.selectors.forEach( selector => {
            selector.elements.forEach( element => {
                console.log( chalk.yellow( element.value ) )
            })
        })
        console.log( 'number of rules:', ruleset.rules.length )
        ruleset.rules.forEach( this._processRule.bind( this ) )
    }

    /**
     * Walks over a rule object
     * @private
     * @param rule <Rule>
     */
    _processRule( rule ) {
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

        // Regular ole CSS (although value could be a variable :) )
        console.log( chalk.grey( 'names' ), rule.name.map( name => {
            return name.value
        }).join( ', '))
        console.log( chalk.grey( 'values' ), this._getRuleValue( rule ) )
    }


    /**
     * Walks over a variable rule object
     * @private
     * @param rule <Rule>
     */
    _processVariableRule( rule ) {
        console.log( chalk.grey( 'name' ), rule.name )
        console.log( chalk.grey( 'values' ), rule.value.toCSS() )
    }

    /**
     * Recurses rule value object looking for actual output
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
}
