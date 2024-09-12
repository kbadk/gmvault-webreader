import React from 'react';

export default class Spinner extends React.Component {
	render() {
		return (<div id="spinnerWrapper" style={{ display: this.props.isLoading || 'none' }}>
			<div id="spinner"></div>
		</div>);
	}

}
