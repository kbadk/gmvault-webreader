const StyleLintPlugin = require('stylelint-webpack-plugin');

module.exports = {
	entry: ['babel-polyfill', './client/index.jsx'],
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: [
					{ loader: 'babel-loader' },
					{ loader: 'eslint-loader', options: { fix: true } }
				]
			},
			{
				test: /\.(scss)$/,
				exclude: /node_modules/,
				use: ['style-loader', 'css-loader', 'sass-loader']
			}
		]
	},
	resolve: {
		extensions: ['.js', '.jsx', '.scss']
	},
	output: {
		path: __dirname + '/public',
		publicPath: '/public',
		filename: 'bundle.js'
	},
	devtool: 'source-map',
	plugins: [
		new StyleLintPlugin({
			configFile: '.stylelintrc.json',
			files: 'client/*.scss',
			syntax: 'scss',
			fix: true
		}),
	]
};