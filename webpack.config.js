const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');
const StyleLintPlugin = require('stylelint-webpack-plugin');

module.exports = {
	entry: './client/index.jsx',
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: [
					{ loader: 'babel-loader' },
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
		path: path.resolve(__dirname, 'public'),
		publicPath: '/public',
		filename: 'bundle.js'
	},
	devtool: 'source-map',
	plugins: [
		new ESLintPlugin({
			extensions: ['js', 'jsx'],
			fix: true,
		}),
		new StyleLintPlugin({
			configFile: '.stylelintrc.json',
			files: 'client/*.scss',
			fix: true
		}),
	]
};
