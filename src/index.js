
const path = require('path')
const vm = require('vm')

// see https://github.com/handlebars-lang/handlebars.js/issues/953
const handlebarsResolved = require.resolve('handlebars/dist/handlebars.js')
const Handlebars = require(handlebarsResolved)


function loader(source) {

  // find our chunk name
  const [chunkName] = [...this._compilation.entries.entries()]
    .find(([n, e]) => e.dependencies.some(d =>
      this.resource === this.utils.absolutify(this.context,
        './'+path.basename(d.userRequest.split('!').slice(-1)[0]))))

  const resources = []
  function requireResource(request) {
    resources.push(request)
    return ''
  }

  // make a pass through the template to pick up the requires
  const template = Handlebars.compile(source)
  const templateContext =
    this._compilation.TemplateRenderPlugin._getTemplateContext(chunkName)
  template(templateContext, {
      helpers: {
        requireResource,
        requireEntry: () => '',
      },
    })

  // use webpack's own require to get urls to asset resources
  const requireResourcesCode = resources.map(r =>
      `resources['${r}'] = require('${r}')`
    ).join('\n')

  return `
const Handlebars = require('${handlebarsResolved}')
const source = ${JSON.stringify(source)}
const template = Handlebars.compile(source)

const resources = {}
${requireResourcesCode}

T.rendering = template(T.templateContext, {
    helpers: {
      requireResource: r => resources[r],
      requireEntry: n => T.entryMap[n],
    },
  })

`
}


const STAGE_BASIC = -10    // webpack doesn't export this?

class TemplateRenderPlugin {
  constructor(options) {
    this._options = {
        ...options,
      }
  }

  _getOptions(chunkName) {
    return {
        ...this._options[chunkName],
      }
  }

  _getTemplateContext(chunkName) {
    return {
        ...this._getOptions(chunkName).context,
      }
  }

  apply(compiler) {

    compiler.hooks.compilation.tap('TemplateRenderPlugin', (compilation) => {
      compilation.TemplateRenderPlugin = this
      this._compilation = compilation
      compilation.hooks.optimizeChunks.tap(
        {
          name: 'TemplateRenderPlugin',
          stage: STAGE_BASIC,
        },
        chunks => {
          // find all chunks that used our loader
          const cg = compilation.chunkGraph
          const templateChunks = [...compilation.chunks]
            .filter(c => cg.getChunkModules(c).some(m =>
              m.request && m.request.startsWith(__filename + '!')))

          // remove webpack related entry modules from our template
          // chunks so that we can render the template without dev-server
          // bits
          templateChunks.forEach(c =>
            [...cg.getChunkEntryModulesIterable(c)]
            .filter(m => m.request.match(/\/node_modules\/webpack/))
            .forEach(m => {
               cg.disconnectChunkAndEntryModule(c, m)
            })
          )
        }
      )
    })

    compiler.hooks.thisCompilation.tap('TemplateRenderPlugin', (compilation) => {
      compilation.hooks.processAssets.tap({
        name: 'TemplateRender',
        stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
      }, () => {
        // build mapping of chunks to filenames
        const entryMapPairs = [...compilation.chunks]
          .map(c => ([c.name, [...c.files.values()][0]]))
          .filter(([n, f]) => !!n)

        // find all chunks that used our loader
        const templateChunks = [...compilation.chunks]
          .filter(c => compilation.chunkGraph.getChunkModules(c).some(m =>
            m.request && m.request.startsWith(__filename + '!')))

        // get the asset objects for each template-driven chunk
        const templateAssets = templateChunks
          .map(c => [c.name, [...c.files.values()][0]])

        // run each render script and replace the asset with the results
        templateAssets.forEach(([chunkName, assetName]) => {
          const file = compilation.getAsset(assetName)
          const renderContext = {
              T: {
                entryMap: Object.fromEntries(entryMapPairs.map(([n, f]) => (
                  [n, path.relative(path.dirname(assetName), f)]))),
                rendering: undefined,
                templateContext: this._getTemplateContext(chunkName),
              },
              // some webpack boilerplate needs these:
              self: { location: {} },
              document: {
                currentScript: { src: `./${path.basename(assetName)}` },
              },
            }
          const script = new vm.Script(file.source.source())
          vm.createContext(renderContext)
          script.runInContext(renderContext)
          compilation.updateAsset(assetName,
            new compiler.webpack.sources.RawSource(renderContext.T.rendering))
        })
      })
    })
  }
}
loader.renderPlugin = TemplateRenderPlugin


module.exports = loader

