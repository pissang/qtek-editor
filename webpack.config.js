var path = require('path');
module.exports = {
    entry: {
        'editor': path.resolve(__dirname, 'editor/index.js'),
        'viewer': path.resolve(__dirname, 'viewer/index.js')
    },
    module: {
        loaders: [{
            test: /\.vue$/,
            loader: 'vue'
        },
        {
            test: /\.js$/,
            include: [
                path.resolve(__dirname, 'editor'),
                path.resolve(__dirname, 'common'),
                path.resolve(__dirname, 'viewer')
            ],
            loader: 'babel'
        }]
    },
    babel: {
        presets: [require('babel-preset-es2015')],
        plugins: [require('babel-plugin-transform-runtime')]
    },
    output: {
        library: 'app',
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    }
};