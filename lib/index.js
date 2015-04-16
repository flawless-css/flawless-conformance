
import less from 'less';
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
     * @param task <Task> @TODO check task is an instanceof the base task class
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
                this.emit( err )
                return
            }

            // Process root node as a root
            // Doesnt matter if it doesnt have any rulesets
            try {
                this._processRoot( root )
            } catch( err ) {
                callback( err )
                return
            }


            // Process import files
            // These may not have rulesets either
            try {
                Object.keys( imports.files ).forEach( filename => {
                    this._processRoot( imports.files[ filename ] )
                })
            } catch( err ) {
                callback( err )
                return
            }



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
     * Routes node types to their handlers... hopefully
     * @private
     * @param node <Node>
     * @throws <Error> on node type not understood
     */
    _processNode( node ) {
        // Ignore import rules
        if ( /import/i.test( node.type ) ) {
            this.emit( PARSE.IMPORT, {
                raw: node
            })
            return
        }

        // Mixins
        // MixinDefinition
        // MixinCall
        if ( /mixin/i.test( node.type ) ) {
            this._processMixin( node )
            return;
        }

        // Comments
        if ( /comment/i.test( node.type ) ) {
            this._processComment( node )
            return;
        }

        // Check for media rule
        if ( /media/i.test( node.type ) ) {
            this._processMedia( node )
            return
        }

        // Check for nesting
        if ( node.isRuleset ) {
            this._processRuleset( node )
            return
        }

        // Check for variable definition
        if ( node.variable === true ) {
            this._processVariable( node )
            return
        }

        // Check for regular old rule
        if ( /rule/i.test( node.type ) ) {
            this._processRule( node )
            return
        }


        console.error( 'node type not recognised :: ' + node.type )
    }


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
            this._processSelectors( ruleset.selectors )
        }

        ruleset.rules.forEach( this._processNode.bind( this ) )
    }


    /**
     * Walks through the selectors object
     * @private
     * @param selectors <Selectors>
     */
    _processSelectors( selectors ) {
        selectors.forEach( selector => {
            this.emit( PARSE.SELECTORS, {
                raw: selector
            })

            this._processSelector( selector )
        })
    }

    /**
     * Walks through a selectors elements array
     * @private
     * @param selector <Selector>
     */
    _processSelector( selector ) {
        selector.elements.forEach( element => {
            this.emit( PARSE.SELECTOR, {
                name: element.value,
                raw: element
            })
        })
    }


    /**
     * Walks over a rule object
     * @private
     * @param rule <Rule>
     */
    _processRule( rule ) {
        // Regular ole CSS rule (although value could be a variable or operator :) )
        this.emit( PARSE.RULE, {
            name: rule.name.map( name => {
                return name.value
            }).join( ', '),
            value: this._getRuleValues( rule.value.value ).join( ', ' ),
            raw: rule
        })
    }


    /**
     * Walks over a variable rule object
     * @private
     * @param rule <Rule>
     */
    _processVariable( rule ) {
        this.emit( PARSE.VARIABLE, {
            name: rule.name,
            value: rule.value.toCSS(),
            raw: rule
        })
    }

    /**
     * Processes a comment
     * Inline or block style
     * @private
     * @param rule <Comment>
     */
    _processComment( rule ) {
        this.emit( PARSE.COMMENT, {
            value: rule.value,
            raw: rule
        })
    }


    /**
     * Processes a mixin
     * MixinDefinition
     * MixinCall
     * @private
     * @param rule <Mixin>
     */
    _processMixin( rule ) {
        this.emit( PARSE.MIXIN, {
            raw: rule
        })

        if ( /Definition/i.test( rule.type ) ) {
            this._processMixinDefinition( rule )
            return
        }

        if ( /Call/i.test( rule.type ) ) {
            this._processMixinCall( rule )
            return
        }

        throw new Error( 'mixin type not understood :: ' + rule.type )
    }

    /**
     * Punt out a mixin call rule
     * @private
     * @param rule <MixinCall>
     */
    _processMixinCall( rule ) {
        this.emit( PARSE.MIXIN_CALL, {
            name: rule.selector.elements.map( element => {
                return element.value
            }).join( ', ' ),
            args: this._getArguments( rule ),
            raw: rule
        })
    }

    /**
     * Punt out a mixin definition rule
     * @private
     * @param rule <MixinDefinition>
     */
    _processMixinDefinition( rule ) {
        this.emit( PARSE.MIXIN_DEFINITION, {
            name: rule.name,
            params: rule.params.map( param => {
                return param.name
            }).join( ', ' ),
            raw: rule
        })

        if ( rule.isRuleset ) {
            this._processRuleset( rule )
            return
        }
    }

    /**
     * Walks through a media type object
     * @private
     * @param rule <Media>
     */
    _processMedia( rule ) {

        // @TODO this doesnt actually grab all of the features
        this.emit( PARSE.MEDIA, {
            features: this._getRuleValues( rule.features.value ).join( ', ' ),
            raw: rule
        })

        rule.rules.forEach( this._processNode.bind( this ) )
    }


    /*-----------------------------------------------------------*\
     *
     *  Helpers
     *
    \*-----------------------------------------------------------*/

    /**
     * Tries to assign meaning to rule values
     * @private
     * @param value <Value>
     * @return <Array:String>
     */
    _getRuleValues( value ) {
        if ( typeof value === 'string' ) {
            return [ value ]
        }

        return value
            // Try and grab meaniningful leaf nodes
            .map( value => {
                return value.value[ 0 ]
            })
            // Handle leaf nodes by type of content
            .map( leaf => {
                // simple
                if ( leaf.value ) {
                    return leaf.value
                }

                // variables are named rather than valued
                if ( leaf.name ) {
                    return leaf.name
                }

                // Ops are tricky
                // @TODO
                if ( leaf.type.toLowerCase() === 'operation' ) {
                    return 'Operation'
                }

                // @TODO make sure something more meaningful happens on fallthrough
                console.error( '[Conformance] can not find leaf value/s' )
            })
            // filter out invalid nodes
            .filter( leaf => {
                return leaf
            })
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

    /**
     * Makes a grab for all mixin arguments
     * @private
     * @param rule <MixinCall>
     * @returns <Array:Object>
     */
    _getArguments( rule ) {
        return rule.arguments.map( arg => {
            try {
                return arg.value.value[ 0 ]
            } catch( err ) {
                console.error( 'error grabbing arguments' )
                return []
            }
        })
    }
}
