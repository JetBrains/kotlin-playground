const path = require('path');
const webpack = require('webpack');
const HtmlPlugin = require('html-webpack-plugin');

module.exports =  (params = {}) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const entryName = isProduction ? 'runcode.min' : 'runcode';

  return {
    entry: {
      [entryName]: './src/index'
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
        }
      ]
    },

    plugins: [
      new HtmlPlugin({
        template: 'src/demo.ejs',
        filename: 'demo.html',
        inject: 'head',
        title: 'KotlinRunCode demo'
      })
    ]
  };
};
