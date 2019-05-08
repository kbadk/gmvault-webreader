import React from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';

import SearchBar from './SearchBar';
import EmailIndex from './EmailIndex';
import EmailView from './EmailView';
import InvalidPage from './InvalidPage';

// webpack updates basename in public/index.html during `npm build`.
const basename = document.querySelector('html > head > base[href]').getAttribute('href');

export default class App extends React.Component {
	render() {
		return (<Router basename={basename}>
			<header>
				<h1><Link to="/">Gmvault Browser</Link></h1>
				<SearchBar></SearchBar>
			</header>
			<div id="container">
				<Switch>
					<Route exact path="/" component={EmailIndex} />
					<Route exact path="/page/:num" component={EmailIndex} />
					<Route exact path="/search/:query" component={EmailIndex} />
					<Route exact path="/view/:path/:name" component={EmailView} />
					<Route component={InvalidPage} />
				</Switch>
			</div>
		</Router>);
	}
}