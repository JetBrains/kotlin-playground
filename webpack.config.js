const path = require('path');
const webpack = require('webpack');
const HtmlPlugin = require('html-webpack-plugin');

module.exports = (params = {}) => {
  const isProduction = params.production;
  const env = isProduction ? 'production' : 'development';
  const mainEntryName = isProduction ? 'playground.min' : 'playground';
  const isServer = process.argv[1].includes('webpack-dev-server');
  const libraryName = 'KotlinPlayground';
  const webDemoUrl = params.webDemoUrl || 'https://try.kotlinlang.org';
  const examplesPath = isServer ? '' : 'examples/';

  const config = {
    mode: env,
    entry: {
      [mainEntryName]: ['./src/index'],
      REMOVE_ME: [
        `!!file-loader?name=${examplesPath}examples.css!github-markdown-css/github-markdown.css`,
        `!!file-loader?name=${examplesPath}examples-highlight.css!highlight.js/styles/github.css`
      ]
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      library: libraryName,
      libraryTarget: 'umd',
      libraryExport: 'default'
    },

    devtool: 'source-map',

    module: {
      rules: [
        {
          test: /\.js$/,
          include: path.resolve(__dirname, 'src'),
          loader: 'babel-loader'
        },
        {
          test: /\.monk$/,
          loader: 'monkberry-loader'
        },
        {
          test: /\.scss$/,
          use: [
            'style-loader',
            'css-loader',
            'sass-loader'
          ]
        },
        {
          test: /\.svg$/,
          use: [
            'svg-url-loader',
            'svg-fill-loader'
          ]
        },
        {
          test: /\.md$/,
          loader: path.resolve(__dirname, 'utils/markdown-loader.js')
        }
      ]
    },

    plugins: [
      new HtmlPlugin({
        template: 'examples.md',
        filename: isServer ? 'index.html' : 'examples/index.html',
        inject: false
      }),

      new webpack.optimize.ModuleConcatenationPlugin(),

      new webpack.DefinePlugin({
        __WEBDEMO_URL__: JSON.stringify(webDemoUrl),
        __IS_PRODUCTION__: isProduction,
        __LIBRARY_NAME__: JSON.stringify(libraryName),
        'process.env': {
          NODE_ENV: JSON.stringify(env)
        }
      }),

      // Remove all removeme* assets
      {
        apply: (compiler) => {
          compiler.plugin('emit', (compilation, done) => {
            const { assets } = compilation;

            Object.keys(assets).forEach((name) => {
              if (name.includes('REMOVE_ME')) {
                delete assets[name];
              }
            });

            done();
          });
        }
      }
    ],

    devServer: {
      contentBase: path.resolve(__dirname, 'src')
    }
  };

  return config;
};
