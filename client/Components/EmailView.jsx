import React from 'react';
import EmailFrame from './EmailFrame';
import { formatLongDate } from '../time-helper';
import EmailDatabase from '../emails';

// Attachment groups as set by server/email/email-attachments.js, in the order they're shown.
const ATTACHMENT_GROUPS = [
	['attachment', 'Attachments'],
	['unused', 'Unused inline images'],
	['embedded', 'Embedded in message'],
];

export default class EmailView extends React.Component {
	render() {
		const email = this.state && this.state.email;

		if (this.state && this.state.error) {
			document.title = 'Gmvault: Email not found';
			return (<div id="EmailView"><p id="error">This email couldn't be loaded.</p></div>);
		}

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
				<EmailFrame email={email} emailPath={`${this.props.match.params.path}/${this.props.match.params.name}`} />
				{this.attachmentList(email)}
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
		try {
			this.setState({ email: await EmailDatabase.get(id) });
		} catch (e) {
			this.setState({ error: true });
		} finally {
			clearTimeout(timeout);
			this.props.setLoading(false);
		}
	}

	attachmentList(email) {
		const { path, name } = this.props.match.params;
		// Largest first, as they're probably the most important.
		const attachments = email.attachments
			.map((attachment, index) => ({ ...attachment, index }))
			.sort((a, b) => b.size - a.size);

		if (!attachments.length) {
			return null;
		}

		return (<div id="attachments">
			{ATTACHMENT_GROUPS.map(([group, title]) => {
				const groupAttachments = attachments.filter(attachment => attachment.group === group);
				return groupAttachments.length > 0 && (<div key={group}>
					<h3>{title}</h3>
					<ul>
						{groupAttachments.map(({ index, filename = `attachment-${index}`, size }) => (
							<li key={index}>
								<a href={`attachment/${path}/${name}/${index}`} title={filename}>
									{this.splitFilename(filename).map((part, i) => <span key={i}>{part}</span>)}
								</a>
								<span className="size">({this.formatSize(size)})</span>
							</li>
						))}
					</ul>
				</div>);
			})}
		</div>);
	}

	/**
	 * Split a filename in two, so the first part can be truncated with an ellipsis, while the end and the extension
	 * stay visible.
	 */
	splitFilename(filename) {
		const chars = Array.from(filename);
		const extension = filename.match(/\.[^.]{1,10}$/);
		const tailLength = Math.max(10, extension ? extension[0].length + 4 : 0);
		if (chars.length <= tailLength) {
			return [filename];
		}
		return [chars.slice(0, -tailLength).join(''), chars.slice(-tailLength).join('')];
	}

	formatSize(bytes) {
		const units = ['B', 'KB', 'MB', 'GB'];
		let unit = 0;
		while (bytes >= 1024 && unit < units.length - 1) {
			bytes /= 1024;
			unit++;
		}
		return `${unit ? bytes.toFixed(1) : bytes} ${units[unit]}`;
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
