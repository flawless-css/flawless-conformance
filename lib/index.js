
import stream from 'stream';
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
export default class Conformance extends stream.Transform {
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
            output: false
        }, opts )

        this.input = ''
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
        this.push( chunk )
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
            }
            // this.push( res.css )
            done()
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
        root.rulesets().forEach( this._processRuleset.bind( this ) )

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

        console.log( '' )
    }

    /**
     * Walks over a rule object
     * @private
     * @param rule <Rule>
     */
    _processRule( rule ) {
        if ( rule.variable ) {
            this._processVariableRule( rule )
            return
        }

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
