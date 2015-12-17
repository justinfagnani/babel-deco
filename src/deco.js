import template from 'babel-template';

const buildGetPropertyDescriptor = template(`
  let PROP_TEMP = {
    writable: true,
    enumerable: true,
    configurable: true,
  };
`);

const buildPropertyDecoratorInvoke = template(`
  PROP_TEMP = DECORATOR_NAME(CLASS_NAME.prototype, PROP_NAME, PROP_TEMP) || PROP_TEMP;
`);

const buildSetPropertyDescriptor = template(`
  if (PROP_TEMP) Object.defineProperty(CLASS_NAME.prototype, PROP_NAME, PROP_TEMP);
`);

const buildDesugaredClass = template(`
  let CLASS_NAME = (function() {
    CLASS_DECLARATION
    CLASS_SETUP
    return CLASS_NAME;
  })();
`);

const buildClassDecoratorInvoke = template(`
  CLASS_NAME = DECORATOR_NAME(CLASS_NAME);
`);

export default function({ types, traverse }) {
  return {
    visitor: {

      Class: function(path) {
        let classNode = path.node;
        let decoratedProperties = []
        path.traverse({
          ClassProperty: function(path) {
            if (path.node.decorators && path.node.decorators.length > 0) {
              decoratedProperties.push(path);
            }
          }
        });

        let desugar = decoratedProperties.length > 0 ||
            (classNode.decorators && classNode.decorators.length > 0);
        let _classConstruction = [];

        // process class properties decorators
        for (let propertyPath of decoratedProperties) {
          let classProperty = propertyPath.node;
          let tempId = path.scope.generateUidIdentifierBasedOnNode(classProperty.key);
          // we may still need to tell the scope we're adding an identifier
          // path.scope.push({ id: tempId });

          _classConstruction.push(buildGetPropertyDescriptor({
            PROP_TEMP: tempId,
            CLASS_NAME: classNode.id,
            PROP_NAME: types.stringLiteral(classProperty.key.name),
            INITIALIZER_EXPR: classProperty.initializer,
          }));

          for (let i = classProperty.decorators.length - 1; i >= 0; i--) {
            let decorator = classProperty.decorators[i];

            _classConstruction.push(buildPropertyDecoratorInvoke({
              DECORATOR_NAME: decorator.expression,
              PROP_TEMP: tempId,
              CLASS_NAME: classNode.id,
              PROP_NAME: types.stringLiteral(classProperty.key.name),
            }));
          }

          _classConstruction.push(buildSetPropertyDescriptor({
            PROP_TEMP: tempId,
            CLASS_NAME: classNode.id,
            PROP_NAME: types.stringLiteral(classProperty.key.name),
          }));
        }

        // process class decorators
        if (classNode.decorators) {
          // console.log('generating decorators for', classNode.id.name, desugar, classNode.decorators, classNode.decorators.length > 0);
          for (let i = classNode.decorators.length - 1; i >= 0; i--) {
            let decorator = classNode.decorators[i];

            _classConstruction.push(buildClassDecoratorInvoke({
              CLASS_NAME: classNode.id,
              DECORATOR_NAME: decorator.expression,
            }));
          }
        }

        if (desugar) {
          path.replaceWith(buildDesugaredClass({
            CLASS_NAME: classNode.id,
            CLASS_DECLARATION: classNode,
            CLASS_SETUP: _classConstruction,
          }));
        }

        // remove all decorators
        path.traverse({
          Decorator: function(path) {
            path.remove();
            let parent = path.parent;
            // work around https://phabricator.babeljs.io/T6714
            if (parent.decorators && parent.decorators.length === 0) {
              parent.decorators = null;
            }
          },
        });

      },

    }
  };
};
