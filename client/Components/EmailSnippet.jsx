/* eslint-disable react/prop-types */
import React from 'react';
import { formatShortDate } from '../time-helper';
import { Link } from 'react-router-dom';

// Attachment icon tooltip limits.
const TOOLTIP_MAX_LENGTH = 70;
const TOOLTIP_MAX_LINES = 5;

export default class EmailSnippet extends React.Component {
	render() {
		const email = this.props.email;
		return (<div className="EmailSnippet" filepath={email.path}>
			<Link to={`/view/${email.path}`}>
				<div className="primaryContainer">
					<div className="sender">
						{email.from && email.from.map(sender => sender.name || sender.address).join(', ')}
					</div>
					<div className="subject">{email.subject}</div>
					<div className="body"><div>{email.snippet}</div></div>
				</div>
				<div className="date">
					{email.attachments.length > 0 && <span className="attachmentHover" title={this.attachmentTitle(email)}>
						{this.attachmentIcon}
					</span>}
					{formatShortDate(email.date)}
				</div>
			</Link>
		</div>);
	}

	/**
	 * One line per attachment, up to `TOOLTIP_MAX_LINES`. Long names are shortened in the middle to keep the
	 * extension, as browsers wrap tooltips at different widths (about 75 characters in one tested browser).
	 */
	attachmentTitle(email) {
		const names = email.attachments.map(({ filename, contentType }) => filename
			? EmailSnippet.shorten(filename, TOOLTIP_MAX_LENGTH)
			: contentType);

		if (names.length > TOOLTIP_MAX_LINES) {
			const hidden = names.splice(TOOLTIP_MAX_LINES - 1);
			names.push(`+${hidden.length} more`);
		}
		return names.join('\n');
	}

	static shorten(name, maxLength) {
		const chars = Array.from(name);
		if (chars.length <= maxLength) {
			return name;
		}
		const tailLength = Math.floor(maxLength / 3);
		const headLength = maxLength - tailLength - 1;
		return chars.slice(0, headLength).join('') + '…' + chars.slice(-tailLength).join('');
	}

	// Courtesy of Material Design Icons: https://material.io/tools/icons/?icon=attach_file&style=baseline
	attachmentIcon = (<svg className="attachmentIcon" xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24">
		<path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
		<path d="M0 0h24v24H0z" fill="none" />
	</svg>);
}