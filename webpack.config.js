const path = require('path');
const webpack = require('webpack');
const HtmlPlugin = require('html-webpack-plugin');

module.exports =  (params = {}) => {
  const isProduction = params.production;
  const mainEntryName = isProduction ? 'runcode.min' : 'runcode';
  const webDemoUrl = params.webDemoUrl || 'https://try.kotlinlang.org';

  return {
    entry: {
      [mainEntryName]: './src/index',
      REMOVE_ME: '!!file-loader?name=examples/examples.css!github-markdown-css/github-markdown.css',
      REMOVE_ME_2: '!!file-loader?name=examples/examples-highlight.css!highlight.js/styles/github.css'
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      library: 'KotlinRunCode',
      libraryTarget: 'umd'
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
        filename: 'examples/index.html',
        inject: false
      }),

      new webpack.DefinePlugin({
        __WEBDEMO_URL__: JSON.stringify(webDemoUrl)
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
    ]
  };
};
