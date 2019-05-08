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
					<div id="senders">{this.emailsToString(email.from)}</div>
					<div id="recipients">to: {this.emailsToString(email.to)}</div>
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
		this.setState({
			email: await EmailDatabase.get(id)
		});
	}

	emailsToString(emails) {
		return emails && emails.value.map(email => (
			<span key={email.address}><strong>{email.name}</strong>
				&nbsp;<span>&lt;{email.address}&gt;</span>&nbsp;
			</span>
		));
	}

}