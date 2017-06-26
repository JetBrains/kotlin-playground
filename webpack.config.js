const webpack = require('webpack'),
  WebpackExtractTextPlugin = require('extract-text-webpack-plugin'),
  path = require('path');


const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

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
        use: 'babel-loader',
        include: [
          path.resolve(__dirname, 'scripts')
        ]
      },
      {
        test: /\.monk$/,
        use: 'monkberry-loader'
      },
      {
        test: /\.scss$/,
        use: WebpackExtractTextPlugin.extract({
          fallback: 'style-loader',
          filename: 'app.bundle.css',
          use: ['css-loader', 'sass-loader']
        })
      },
      {
        test: /\.svg/,
        loader: 'svg-fill-loader?raw=false'
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
