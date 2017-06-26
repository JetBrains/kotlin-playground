const webpack = require('webpack'),
  WebpackExtractTextPlugin = require('extract-text-webpack-plugin'),
  path = require('path');


const env = process.env.NODE_ENV || 'development',
  isProduction = env === 'production';

module.exports = {
  entry: './scripts/init.js',
  output: {
    path: __dirname,
    filename: 'build/[name].js',
  },
  devtool: isProduction ? false : 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: [
          path.resolve(__dirname, 'scripts')
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
      }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      jQuery: 'jquery',
      $: 'jquery',
      jquery: 'jquery'
    }),
    new WebpackExtractTextPlugin('build/[name].css')
  ],
  devServer: {
    contentBase: __dirname,
    host: '0.0.0.0',
    port: 9009
  }
};
