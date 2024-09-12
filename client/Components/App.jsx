import React from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';

import SearchBar from './SearchBar';
import EmailIndex from './EmailIndex';
import EmailView from './EmailView';
import InvalidPage from './InvalidPage';
import Spinner from './Spinner';

// webpack updates basename in public/index.html during `npm build`.
const basename = document.querySelector('html > head > base[href]').getAttribute('href');

export default class App extends React.Component {
	state = {
		isLoading: false
	}

	setLoading = (isLoading) => {
		this.setState({ isLoading });
	}

	render() {
		return (<Router basename={basename}>
			<header>
				<h1><Link to="/">Gmvault Browser</Link></h1>
				<SearchBar></SearchBar>
			</header>
			<div id="container">
				<Spinner isLoading={this.state.isLoading}></Spinner>
				<Switch>
					<Route
						exact path="/"
						render={(props) => <EmailIndex {...props} setLoading={this.setLoading} />}
					/>
					<Route
						exact path="/page/:num"
						render={(props) => <EmailIndex {...props} setLoading={this.setLoading} />}
					/>
					<Route
						exact path="/search/:query"
						render={(props) => <EmailIndex {...props} setLoading={this.setLoading} />}
					/>
					<Route exact path="/view/:path/:name"
						render={(props) => <EmailView {...props} setLoading={this.setLoading} />}
					/>
					<Route component={InvalidPage} />
				</Switch>
			</div>
		</Router>);
	}
}
