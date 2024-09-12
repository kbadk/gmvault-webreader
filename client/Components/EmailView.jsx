import React from 'react';
import EmailFrame from './EmailFrame';
import { formatLongDate } from '../time-helper';
import EmailDatabase from '../emails';

export default class EmailView extends React.Component {
	render() {
		const email = this.state && this.state.email;

		if (!email) {
			return (<div id="EmailView"></div>);
		}

		document.title = email.subject;

		return (<div id="EmailView">
			<div id="metaData">
				<div>
					<button
						onClick={() => history.back()}>
						{this.backIcon}
					</button>
					<div id="addresses">
						<div id="senders">{this.emailsToString(email.from)}</div>
						<div id="recipients">to: {this.emailsToString(email.to)}</div>
					</div>
				</div>
				<div>
					<div id="date">{formatLongDate(email.date)}</div>
				</div>
			</div>
			<div id="emailContents">
				<h2>{email.subject}</h2>
				<EmailFrame email={email} />
			</div>
		</div>);
	}

	componentDidMount() {
		const { path, name } = this.props.match.params;
		this.getEmail(`${path}/${name}`);
	}

	async getEmail(id) {
		// Getting an email is usually very fast. To avoid a spinner flashing,
		// we wait for 0.5s, and only then add the spinner if the email
		// hasn't loaded.
		const timeout = setTimeout(function(setLoading) {
			setLoading(true);
		}, 500, this.props.setLoading);
		const email = await EmailDatabase.get(id);
		clearTimeout(timeout);

		this.setState({
			email: email
		});
		this.props.setLoading(false);
	}

	emailsToString(emails) {
		return emails && emails.value.map(email => (
			<span key={email.address}><strong>{email.name}</strong>
				&nbsp;<span>&lt;{email.address}&gt;</span>&nbsp;
			</span>
		));
	}

	// Courtesy of Material Design Icons: https://material.io/tools/icons/?icon=search&style=baseline
	backIcon = (<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 24 24">
		<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
		<path d="M0 0h24v24H0z" fill="none" />
	</svg>);
}
