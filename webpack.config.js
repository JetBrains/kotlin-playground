var webpack = require('webpack');
var WebpackExtractTextPlugin = require('extract-text-webpack-plugin');


module.exports = {
    entry: "./scripts/init.js",
    output: {
        path: __dirname,
        filename: "bundle.js"
    },
    plugins: [
        new webpack.ProvidePlugin({
            jQuery: 'jquery',
            $: 'jquery',
            jquery: 'jquery'
        }),
        new WebpackExtractTextPlugin('[name].css')
    ],
    module: {
        loaders: [
            {
                test: /\.monk$/,
                loader: 'monkberry-loader'
            }
            ,
            {
                test: /\.css$/,
                loader: WebpackExtractTextPlugin.extract([
                    'css',
                    'postcss'
                ].join('!'))
            },
            {
                test: /\.scss$/,
                loader: WebpackExtractTextPlugin.extract([
                    'css',
                    'postcss',
                    'resolve-url?keepQuery',
                    'sass?sourceMap'
                ].join('!'))
            },
            {
                test: /\.svg/,
                loaders: [
                    'url',
                    'svg-fill'
                ]
            }]
    }
};
