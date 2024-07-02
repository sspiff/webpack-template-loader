# webpack-template-loader
webpack loader that renders output using handlebars.


## Installation

```
$ npm install -D @sspiff/webpack-template-loader
```


## Overview

`webpack-template-loader` is a webpack loader that transforms its input using
[handlebars](https://handlebarsjs.com/guide/) with the help of a webpack
plugin.  It can serve as an alternative to (although not a drop-in replacement
for) `html-webpack-plugin`, for example, or used to generate JSON from a
template.

`webpack-template-loader` operates in two phases: First as a loader in which it
generates javascript that, when executed, will output the results of passing
its input through handlebars.  Then as a webpack plugin that will execute
the javascript to produce the rendered output.  *Because of this two-phase
approach, it must be the last applied (i.e. the first listed) loader in the
chain.*

When compiling a template, `webpack-template-loader` makes two
[helpers](https://handlebarsjs.com/guide/#custom-helpers) available
for the template to use: `requireResource` and `requireEntry`.

`requireResource` will return the webpack output path for static resources
(e.g. `asset/resource` type modules).  Use it, for example, in JSON templates
to reference images or other assets.

`requireEntry` will return the webpack output path for entry-type modules.
It takes as input the chunk name as defined in the entry descriptor in
the webpack configuration.  Modules referenced using `requireEntry` should
generally be defined as entry modules in the webpack config.  Use it, for
example, in an HTML template to reference a webpack-built javascript bundle.

The context (or parameters) for each template are given when instantiating
the plugin.  See the example below.


## Basic Usage

In `webpack.config.js`:

<pre>
<b>const TemplateRenderPlugin = require('@sspiff/webpack-template-loader').renderPlugin</b>

module.exports = {
  entry: {
    <em><b>indexhtml</b></em>: {
      <b>// the 'template!=!' prefix is used to identitfy templates to be
      // consumed by the webpack-template-loader:</b>
      import: '<b>template!=!./src/index.html.hbs</b>',
      filename: 'index.html',
    },
    <em><b>bundle</b></em>: {
      import: './src/index.js',
      filename: 'bundle.js',
    },
  },
  module: {
    rules: [
      <b>{
        // this rule will route entry imports that start with 'template!=!'
        // to the webpack-template-loader:
        test: /^template$/,
        loader: '@sspiff/webpack-template-loader',
      },</b>
      {
        test: /\.png$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    <b>// a TemplateRenderPlugin must be instantiated in order to complete
    // the final renderings of the templates:
    new TemplateRenderPlugin({
      // template-specific options can be provided here, indexed by entry name:
      <em>indexhtml</em>: {
        // the context/parameters for the '<em>indexhtml</em>' template:
        context: {
          <em>mytitle</em>: "@sspiff/webpack-template-loader Example",
        },
      },
    }),</b>
  ],
}
</pre>

And somewhere in `src/index.html.hbs`:

<pre>
&lt;head>
  &lt;link rel="icon" href="<b>{{requireResource "./favicon.png"}}</b>" />
  &lt;title><b>{{<em>mytitle</em>}}</b>&lt;/title>
&lt;/head>

&lt;body>
  &lt;script src="<b>{{requireEntry "<em>bundle</em>"}}</b>">&lt;/script>
&lt;/body>
</pre>

