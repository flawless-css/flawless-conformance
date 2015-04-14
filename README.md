# Flawless-conformance

> Conformance testing for less

- [ ] dead code duplication
- [ ] multiple global variable declaration
- [ ] warn against global variables in files other than variable definition files
- [ ] nesting level - 1 max (to allow variable scoping—in which it is debateable that the closure should contain any output—. level should be configurable to allow media queries and pseudo-classes inside a scope)
- [ ] mixins only for utility classes, single use
- [ ] selector naming conventions
- [ ] single component per file
- [ ] never use ID styling
- [ ] enforce color units (e.g. only rgba allowed, or only from a specific variable definition file)
- [ ] multiple rules should live on new lines
- [ ] use _is_ i.e. `.Component--is-disabled` instead of `.Component-disabled`
- [ ] _is_ classes always scoped to a parent i.e. no bare `.is-transitioning` classes lying around, use `.Component.is-transitioning` instead
- [ ] static analysis output
- [ ] perf testing, load testing etc (probably out of scope for conformance)

## Code duping

```
a {
    color: blue;
}
.some-other-selector {
    color: white;
}
a {
    color: green;
    cursor: pointer;
}
```

The anchor styling is duplicated, making the earlier selector unnecessary. In all likelihood this has been caused by importing from another file and is a developer error.

## Variable definition files

Stuff like `z-indexing`, `colors` and `font-weights` should live in their own variable definition files (often called __modules__, where __partials__ actually output css, modules do not). Variable definition files should probably not be allowed to output any css.
