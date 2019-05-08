import React from 'react';

export default class EmailFrame extends React.Component {
	render() {
		return (<iframe id="EmailFrame" ref={iframe => this.iframe = iframe}/>);
	}

	componentDidMount() {
		this.doc = this.iframe.contentDocument;

		// Apparently some emails have embedded scripts...
		const html = EmailFrame.removeScripts(this.props.email.html);

		// shh bby is ok
		this.doc.open();
		this.doc.write(html);
		this.doc.close();
		this.doc.head.insertAdjacentHTML('afterbegin',
			'<style>body { background: #fff; font-family: sans-serif; }</style>');

		const resizeObserver = new ResizeObserver((objs) =>
			objs.forEach(() => this.iframe.style.height = this.doc.body.scrollHeight + 'px'));
		resizeObserver.observe(this.doc.body);
	}

	/**
	 * Remove all scripts and `on` eventhandlers.
	 */
	static removeScripts(html) {
		const container = document.createElement('div');
		container.innerHTML = html;
		// Removes scripts
		container.querySelectorAll('script').forEach((script) => script.remove());

		EmailFrame.removeOnAttributes(container);
		return container.innerHTML;
	}

	/**
	 * Remove all `on` eventhandlers like `onclick` and so on by lazily removing all attributes beginning with `on`,
	 * because it's easier than matching everything on this long-ass list.
	 * https://www.w3.org/TR/html50/webappapis.html#event-handlers-on-elements,-document-objects,-and-window-objects
	 * Arguably, this will also be safer for when they inevitably add something like `onblink` and `onlookaway` for
	 * eye-tracking purposes or whatever. We could also just remove all attributes, but they may be needed for CSS
	 */
	static removeOnAttributes(html) {
		Array.from(html.attributes).forEach(attribute => {
			if (attribute.name.toLowerCase().startsWith('on')) {
				html.removeAttribute(attribute.name);
			}
		});
		Array.from(html.children).forEach(EmailFrame.removeOnAttributes);
	}
}