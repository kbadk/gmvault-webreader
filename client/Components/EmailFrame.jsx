import React from 'react';

export default class EmailFrame extends React.Component {
	render() {
		return (<iframe id="EmailFrame" ref={iframe => this.iframe = iframe}/>);
	}

	componentDidMount() {
		this.doc = this.iframe.contentDocument;

		const email = this.props.email;
		const html = EmailFrame.removeScripts(email.html
			|| email.textAsHtml
			|| EmailFrame.preformatted(email.text || ''));

		// shh bby is ok
		this.doc.open();
		this.doc.write('<!DOCTYPE html>' + html);
		this.doc.close();
		// The frame is sized to the body, so the body's height mustn't depend on the frame's: `height: auto` stops an
		// email's `height: 100%` from following it, and padding replaces the default margin, which `flow-root` keeps
		// child margins inside of.
		this.doc.head.insertAdjacentHTML('afterbegin',
			`<style>
				html, body {
					height: auto !important;
					min-height: 0 !important;
				}
				body {
					margin: 0 !important;
					padding: 8px;
					display: flow-root;
					background: #fff;
					font-family: sans-serif;
				}
			</style>`);

		// Emails sized in `vh` can still grow the frame on every resize, so stop following them if they do.
		const resizes = [];
		this.resizeObserver = new ResizeObserver(() => {
			const now = Date.now();
			resizes.push(now);
			while (resizes[0] < now - 1000) {
				resizes.shift();
			}
			if (resizes.length > 30) {
				return this.resizeObserver.disconnect();
			}
			if (this.iframe) {
				this.iframe.style.height = this.doc.body.scrollHeight + 'px';
			}
		});
		this.resizeObserver.observe(this.doc.body);

		// #EmailFrame initiallty has `opacity: 0` defined in the SCSS.
		setTimeout(() => {
			if (this.iframe) this.iframe.style.opacity = 1;
		}, 100);
	}

	componentWillUnmount() {
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}
	}

	/**
	 * Wrap plain text in `<pre>`, escaping any HTML in it.
	 */
	static preformatted(text) {
		const pre = document.createElement('pre');
		pre.textContent = text;
		return pre.outerHTML;
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
