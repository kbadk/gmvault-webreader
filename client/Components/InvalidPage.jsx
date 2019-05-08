import React from 'react';

export default class InvalidPage extends React.Component {
	render() {
		return (<div style={{padding: '1em'}}>
			<h2>404 – Invalid page</h2>
			<p>If you expected something else here, chances are you're trying to host this application in a subdirectory, but
				haven't configured it so.
			</p>
		</div>);
	}
}