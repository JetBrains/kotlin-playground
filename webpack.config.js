const path = require('path');
const webpack = require('webpack');
const WebpackExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports =  (params = {}) => {
  return {
    entry: './src/index.js',

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'runcode.js',
      library: 'KotlinExecutableCode',
      libraryTarget: 'umd'
    },

    devtool: false,

    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'babel-loader',
          include: [
            path.resolve(__dirname, 'src')
          ]
        },
        {
          test: /\.monk$/,
          loader: 'monkberry-loader'
        },
        {
          test: /\.twig$/,
          loader: 'twig-loader'
        },
        {
          test: /\.scss$/,
          loader: WebpackExtractTextPlugin.extract({
            fallback: 'style-loader',
            use: ['css-loader', 'sass-loader']
          })
        },
        {
          test: /\.svg$/,
          loader: [
            {
              loader: 'url-loader',
              options: {
                limit: 20480,
                name: 'assets/[name]-[hash].[ext]'
              }
            },
            'svg-fill-loader'
          ]
        }
      ]
    },

    plugins: [
      new WebpackExtractTextPlugin('[name].css'),

      new HtmlWebpackPlugin({
        template: 'src/demo.twig',
        inject: 'head'
      }),

      new CleanWebpackPlugin('dist')
    ],

    devServer: {
      contentBase: __dirname,
      host: '0.0.0.0',
      port: 9009
    }
  };
};
