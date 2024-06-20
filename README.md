# webpack template-loader
webpack loader that renders output using handlebars.


## Installation

If not already configured, add the registry for the `@sspiff` package scope
to the npm configuration:

```
$ npm config set @sspiff:registry https://npm.pkg.github.com/sspiff -L project
```

Install the package:

```
$ npm install -D @sspiff/template-loader
```


## Overview

`template-loader` is a webpack loader that transforms its input using
[handlebars](https://handlebarsjs.com/guide/) with the help of a webpack
plugin.  It can serve as an alternative to (although not a drop-in replacement
for) `html-webpack-plugin`, for example, or used to generate JSON from a
template.

`template-loader` operates in two phases: First as a loader in which it
generates javascript that, when executed, will output the results of passing
its input through handlebars.  Then as a webpack plugin that will execute
the javascript to produce the rendered output.  *Because of this two-phase
approach, it must be the last applied (i.e. the first listed) loader in the
chain.*

When compiling a template, `template-loader` makes two
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


## Basic Usage

In `webpack.config.js`:

```
const TemplateRenderPlugin = require('@sspiff/template-loader').renderPlugin

module.exports = {
  entry: {
    indexhtml: {
      import: 'template!=!./src/index.html',
      filename: 'index.html',
    },
    bundle: {
      import: './src/index.js',
      filename: 'bundle.js',
    },
  },
  module: {
    rules: [
      {
        test: /^template$/,
        loader: '@sspiff/template-loader',
      },
      {
        test: /\.png$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new TemplateRenderPlugin(),
  ],
}
```

And somewhere in `src/index.html`:

```
<head>
  <link rel="icon" href="{{requireResource "./src/favicon.png"}}" />
</head>

<body>
  <script src="{{requireEntry "bundle"}}"></script>
</body>
```

