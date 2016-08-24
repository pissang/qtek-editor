var path = require('path');
module.exports = {
    entry: {
        'index': path.resolve(__dirname, 'app/index.js')
    },
    module: {
        loaders: [{
            test: /\.vue$/,
            loader: 'vue'
        },
        {
            test: /\.js$/,
            include: [path.resolve(__dirname, 'app')],
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