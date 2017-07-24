const path = require('path');
const webpack = require('webpack');
const WebpackExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

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
        filename: 'demo.html',
        inject: 'head'
      })
    ],

    devServer: {
      contentBase: __dirname,
      host: '0.0.0.0',
      port: 9009
    }
  };
};
