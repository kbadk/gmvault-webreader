/* eslint-disable react/prop-types */
import React from 'react';
import { formatShortDate } from '../time-helper';
import { Link } from 'react-router-dom';

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
				<div className="date">{formatShortDate(email.date)}</div>
			</Link>
		</div>);
	}
}