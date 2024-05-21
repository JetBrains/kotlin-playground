const path = require('path');
const webpack = require('webpack');
const HtmlPlugin = require('html-webpack-plugin');

module.exports = (params = {}) => {
  const isProduction = params.production;
  const env = isProduction ? 'production' : 'development';
  const mainEntryName = isProduction ? 'playground.min' : 'playground';
  const isServer = process.argv[1].includes('webpack-dev-server');
  const libraryName = 'KotlinPlayground';
  const webDemoUrl = params.webDemoUrl || 'https://api.kotlinlang.org/';
  const examplesPath = isServer ? '' : 'examples/';
  const pathDist = path.resolve(__dirname, 'dist');

  const common = {
    mode: env,

    output: {
      path: pathDist,
      filename: '[name].js',
    },

    devtool: 'source-map',

    module: {
      rules: [
        {
          test: /\.js$/,
          include: path.resolve(__dirname, 'src'),
          loader: 'babel-loader',
        },
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.monk$/,
          loader: 'monkberry-loader',
        },
        {
          test: /\.s[ac]ss$/i,
          use: ['style-loader', 'css-loader', 'sass-loader'],
        },
        {
          test: /\.svg$/,
          use: ['svg-url-loader', 'svg-fill-loader'],
          type: 'javascript/auto',
        },
        {
          test: /\.md$/,
          loader: path.resolve(__dirname, 'utils/markdown-loader.js'),
        },
      ],
    },

    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },

    plugins: [
      new webpack.optimize.ModuleConcatenationPlugin(),
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(env),
        },
      }),
    ],
  };

  const bundle = {
    ...common,

    entry: {
      [mainEntryName]: ['./src/index'],
      REMOVE_ME: [
        `!!file-loader?name=${examplesPath}examples.css!github-markdown-css/github-markdown.css`,
        `!!file-loader?name=${examplesPath}examples-highlight.css!highlight.js/styles/github.css`,
      ],
    },

    output: {
      ...common.output,
      library: libraryName,
      libraryTarget: 'umd',
      libraryExport: 'default',
      publicPath: 'auto',
    },

    plugins: [
      ...common.plugins,

      new HtmlPlugin({
        template: 'examples.md',
        filename: isServer ? 'index.html' : 'examples/index.html',
        inject: false,
      }),

      new webpack.DefinePlugin({
        __WEBDEMO_URL__: JSON.stringify(webDemoUrl),
        __IS_PRODUCTION__: isProduction,
        __LIBRARY_NAME__: JSON.stringify(libraryName),
      }),
    ],
    devServer: {
      static: path.resolve(__dirname, 'src'),
    },
  };

  const crosslink = {
    ...common,
    target: 'node',
    entry: {
      crosslink: './src/lib/crosslink',
    },
    output: {
      ...common.output,
      globalObject: 'this',
      library: {
        name: 'crosslink',
        type: 'umd',
      },
    },
  };

  return [bundle, crosslink];
};
