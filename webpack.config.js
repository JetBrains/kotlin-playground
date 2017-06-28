const webpack = require('webpack'),
  WebpackExtractTextPlugin = require('extract-text-webpack-plugin'),
  HtmlWebpackPlugin = require('html-webpack-plugin'),
  CleanWebpackPlugin = require('clean-webpack-plugin'),
  UglifyJSPlugin = require('uglifyjs-webpack-plugin'),
  path = require('path');


const env = process.env.NODE_ENV || 'development',
  isProduction = env === 'production';

module.exports = {
  entry: {
    runcode: './src/index.js',
    vendor: ['jquery', 'monkberry', 'monkberry-directives',
    'codemirror']
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  devtool: 'source-map',
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
        test: /\.scss$/,
        loader: WebpackExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: ['css-loader', 'sass-loader']
        })
      },
      {
        test: /\.svg$/,
        loader: [
          'url-loader?limit=20480&name=assets/[name]-[hash].[ext]',
          'svg-fill-loader'
        ]
      },
      {
        test: /\.html$/,
        loader: ['html-loader']
      },
      {
        test: /\.(gif|jpg|png)$/,
        loader: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'icons/',
              publicPath: 'icons/'
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      jQuery: 'jquery',
      $: 'jquery',
      jquery: 'jquery'
    }),
    new WebpackExtractTextPlugin('[name].css'),
    new HtmlWebpackPlugin({
      template: 'src/index.html'
    }),
    new CleanWebpackPlugin('dist'),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
    }),
    new UglifyJSPlugin({
      sourceMap: true
    })
  ],
  devServer: {
    contentBase: __dirname,
    host: '0.0.0.0',
    port: 9009
  }
};
