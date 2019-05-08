import React from 'react';
import { withRouter } from 'react-router-dom';

export default withRouter(class SearchBar extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			query: ''
		};

		// This can't possibly be the right way to do it!
		this.props.history.listen((location, type) => this.updateQuery(location));

		this.handleChange = this.handleChange.bind(this);
		this.handleButtonClick = this.handleButtonClick.bind(this);
		this.handleKeyDown = this.handleKeyDown.bind(this);
	}

	componentDidMount() {
		this.updateQuery(this.props.location);
	}

	updateQuery(location) {
		let query = '';
		if (location.pathname.startsWith('/search')) {
			query = location.pathname.substring('/search/'.length);
		}
		this.setState({ query });
	}

	render() {
		return (<div id="SearchBar">
			<input type="text" value={this.state.query}
				onChange={this.handleChange}
				onKeyDown={this.handleKeyDown} />
			<button onClick={this.handleButtonClick}>{this.searchIcon}</button>
		</div>);
	}

	handleChange(event) {
		this.setState({
			query: event.target.value
		});
	}

	handleKeyDown(event) {
		if (event.key === 'Enter') {
			this.performSearch();
		}
	}

	handleButtonClick() {
		this.performSearch();
	}

	performSearch() {
		const query = this.state.query;
		this.props.history.push(`/search/${query}`);
	}

	// Courtesy of Material Design Icons: https://material.io/tools/icons/?icon=search&style=baseline
	searchIcon = (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
		<path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61
		0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5
		11.99 14 9.5 14z" /><path d="M0 0h24v24H0z" fill="none" />
	</svg>);

});