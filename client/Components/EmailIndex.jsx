/* eslint-disable react/prop-types */
import React from 'react';
import EmailSnippet from './EmailSnippet';

import EmailDatabase from '../emails';

export default class EmailIndex extends React.Component {
	state = {
		emailCount: '?'
	}
	PAGE_SIZE = 100;

	constructor(...args) {
		super(...args);
		this.getEmailCount();
		this.setPage = this.setPage.bind(this);
	}

	render() {
		document.title = 'Gmvault Browser';

		const emails = this.state && this.state.emails;
		if (!emails) {
			return (<div id="EmailView"></div>);
		}

		return (<div id="EmailIndex">
			<div id="actionBar" style={{ display: this.state.query && 'none' }}>
				<span>
					{this.state.page * this.PAGE_SIZE}–{this.state.page * this.PAGE_SIZE + emails.length}
					&nbsp;of {this.state.emailCount}
				</span>
				<button
					disabled={this.state.page === 0}
					onClick={() => this.setPage(this.state.page - 1)}>
					{this.prevIcon}
				</button>
				<button
					disabled={(this.state.page + 1 ) * this.PAGE_SIZE > this.state.emailCount}
					onClick={() => this.setPage(this.state.page + 1)}>
					{this.nextIcon}
				</button>
			</div>
			<div id="emailListing">
				{ emails.map((email) => (<EmailSnippet key={email.path} email={email} />)) }
			</div>
		</div>);
	}

	componentDidUpdate() {
		const params = this.props.match.params;

		let query = params.query || undefined;
		if (query) {
			if (this.state.query !== query) {
				this.searchEmails(query);
				this.setState({ query, page: -1 });
			}
			return;
		}

		let page = Number(params.num) || 0;
		if (this.state.page !== page) {
			this.getEmails(this.PAGE_SIZE, page * this.PAGE_SIZE);
			this.setState({ page, query: undefined });
		}
	}

	async getEmailCount() {
		this.setState({
			emailCount: await EmailDatabase.count()
		});
	}

	async getEmails(limit, offset) {
		this.setState({
			emails: await EmailDatabase.browse(limit, offset),
		});
	}

	async searchEmails(query) {
		this.setState({
			emails: await EmailDatabase.search(query),
		});
	}

	setPage(page) {
		this.props.history.push(`/page/${page}`);
	}

	// Courtesy of Material Design Icons: https://material.io/tools/icons/?icon=search&style=baseline
	prevIcon = (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
		<path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /><path d="M0 0h24v24H0z" fill="none" />
	</svg>);

	// Courtesy of Material Design Icons: https://material.io/tools/icons/?icon=search&style=baseline
	nextIcon = (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
		<path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /><path d="M0 0h24v24H0z" fill="none" />
	</svg>);
}
