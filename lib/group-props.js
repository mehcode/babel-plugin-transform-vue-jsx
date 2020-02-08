var makeMap = require('./make-map')
var isTopLevel = makeMap('class,staticClass,style,key,ref,refInFor,slot,scopedSlots')
var nestableRE = /^(props|domProps|on|nativeOn|hook)([\-_A-Z])/
var dirRE = /^v-/
var xlinkRE = /^xlink([A-Z])/

module.exports = function groupProps (props, t) {
  var newProps = []
  var currentNestedObjects = Object.create(null)
  props.forEach(function (prop) {
    var name = prop.key.value || prop.key.name
    if (isTopLevel(name)) {
      // top-level special props
      newProps.push(prop)
    } else {
      // nested modules
      var nestMatch = name.match(nestableRE)
      if (nestMatch) {
        var prefix = nestMatch[1]
        var suffix = name.replace(nestableRE, function (_, $1, $2) {
          return $2 === '-' ? '' : $2.toLowerCase()
        })
        var nestedProp = t.objectProperty(t.stringLiteral(suffix), prop.value)
        var nestedObject = currentNestedObjects[prefix]
        if (!nestedObject) {
          nestedObject = currentNestedObjects[prefix] = t.objectProperty(
            t.identifier(prefix),
            t.objectExpression([nestedProp])
          )
          newProps.push(nestedObject)
        } else {
          nestedObject.value.properties.push(nestedProp)
        }
      } else if (dirRE.test(name)) {
        // custom directive
        name = name.replace(dirRE, '')
        var dirs = currentNestedObjects.directives
        if (!dirs) {
          dirs = currentNestedObjects.directives = t.objectProperty(
            t.identifier('directives'),
            t.arrayExpression([])
          )
          newProps.push(dirs)
        }
        dirs.value.elements.push(t.objectExpression([
          t.objectProperty(
            t.identifier('name'),
            t.stringLiteral(name)
          ),
          t.objectProperty(
            t.identifier('value'),
            prop.value
          )
        ]))
      } else {
        // rest are still top level
        newProps.push(prop)
      }
    }
  })
  return t.objectExpression(newProps)
}
