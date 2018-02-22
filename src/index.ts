export type consoleFunc = (message?: any, ...optionalParams: any[]) => void;

export class OnScreenConsole {
  private _consoleNode: HTMLDivElement;
  private _log: consoleFunc;
  private _warn: consoleFunc;
  private _error: consoleFunc;
  private static _instance: OnScreenConsole;

	constructor() {
		this._consoleNode = this._createConsoleNode();
		this._overwriteNativeMethods();
		this._setErrorListener();
	}
	/**
	 * set the init listener
	 */
	private _setErrorListener(): void {
		const prevOnerror: ErrorEventHandler = window.onerror;
		// add error listener for trying the js error
		// or manually throw error
		window.onerror = (info, path, line, col, err) => {
			// to avoid overwrite the prev onerror function
			if (prevOnerror) {
				prevOnerror(info, path, line, col, err);
			}
			const consoleNode: Element = document.querySelector('[onscreenconsole-id="panel"]');
			if (consoleNode) {
				if (err && err.stack) {
					// format the output
					const msg: string[] = err.stack.split('\n');
					// msg[0] is the error info. skip this
					for(let i = 1; i < msg.length; ++i) {
						// the error stack trace
						// eg: at testfunc (http://xxx.com/test.js:130:32)
						const line = msg[i].trim().split(' ');
						// get file name, eg: test.js:130:32
						const line2 = line.length === 3 ? line[2] : line[1];
						const paths = line2.split('/');
						let fileName = paths[paths.length - 1];
						fileName = fileName.substring(0, fileName.length - 1);
						// get file path, eg: http://xxx.com/test.js
						let filePath = line2.substring(1, line2.length - 1).split(':');
						// pop the colomn number, eg: 32
						filePath.pop();
						// pop the line number, eg: 130
						filePath.pop();
						// format markup
						msg[i] = `&emsp;${line[0]} ${line.length === 3 ? `${line[1]} ` : ''}(<a href="${filePath.join(':')}">${fileName}</a>)`;
					}
					this.error(`${msg.join('<br/>')}`);
				} else {
					this.error(info);
				}
				// block the native console print
				return true;
			} else {
				// allow the native console print
				return false;
			}
		};
	}
	/**
	 * overwrite log, warn and error method
	 */
	private _overwriteNativeMethods(): void {
    for (let method of OnScreenConsole._supportedMethods) {
      (this as any)[`_${method}`] = (console as any)[method].bind(console);
      (console as any)[method] = (this as any)[method].bind(this);
    }
	}
	/**
	 * create the console panel dom element
	 * @return {HTMLDivElement}
	 */
	private _createConsoleNode(): HTMLDivElement {
		const consoleNode: HTMLDivElement = document.createElement('div');
		consoleNode.setAttribute('onscreenconsole-id', 'panel');
		consoleNode.style.cssText = `
			cursor: default;
			position: fixed;
			z-index: 99;
			height: 240px;
			width: 100%;
			bottom: -250px;
			left: 0;
			overflow: scroll;
			background-color: #fff;
			-webkit-box-shadow: 0 -2px 5px #00000033;
							box-shadow: 0 -2px 5px #00000033;
			-webkit-box-sizing: border-box;
							box-sizing: border-box;
			transition: all .2s;
		`;

		const hideBtn: HTMLButtonElement = document.createElement('button');
		hideBtn.style.cssText = `
			position: fixed;
			z-index: 999;
			height: 32px;
			width: 32px;
			bottom: 6px;
			right: 6px;
			color: #0089A7;
			border: 1px solid #0089A7;
			background-color: #fff;
			cursor: pointer;
			-webkit-box-shadow: 0 2px 5px #00000033;
							box-shadow: 0 2px 5px #00000033;
		`;
		hideBtn.innerHTML = '&darr;';
		hideBtn.onclick = this.hide.bind(this);
		consoleNode.appendChild(hideBtn);

		const showBtn: HTMLButtonElement = document.createElement('button');
		showBtn.style.cssText = `
			position: fixed;
			z-index: 9;
			height: 32px;
			width: 32px;
			bottom: 6px;
			right: 6px;
			color: #0089A7;
			border: 1px solid #0089A7;
			background-color: #fff;
			cursor: pointer;
			-webkit-box-shadow: 0 2px 5px #00000033;
							box-shadow: 0 2px 5px #00000033;
		`;
		showBtn.innerHTML = '&uarr;';
		showBtn.onclick = this.show.bind(this);
		consoleNode.appendChild(showBtn);

		return consoleNode;
	}
	/**
	 * internal print method
	 * @param {string} method enum {'log', 'warn', 'error'}
	 */
	_print(method: 'log' | 'warn' | 'error'): consoleFunc {
		return function(...args: any[]): void {
			// create error message dom element
			const msgNode: HTMLDivElement = document.createElement('div');
			msgNode.style.cssText = `
				font-size: 14px;
				color: ${OnScreenConsole._supportedColors[method]};
        background-color: ${OnScreenConsole._supportedColors[method]}11;
        border-top: 1px solid ${OnScreenConsole._supportedColors[method]}33;
				padding: 6px;
				width: 100%;
			`;
			// set innerHTML
			msgNode.innerHTML = args.join(' ');
			// check if it's enable
			const consoleNode: Element = document.querySelector('[onscreenconsole-id="panel"]');
			if (consoleNode) {
				// print the output
				consoleNode.appendChild(msgNode);
				consoleNode.scrollTop = consoleNode.scrollHeight;
			} else {
				// if disable, invoke the native method first to print in console
				this['_' + method](...args);
			}
		};
	}
	get log(): consoleFunc {
		return this._print('log');
	}
	get warn(): consoleFunc {
		return this._print('warn');
	}
	get error(): consoleFunc {
		return this._print('error');
	}
	// controllers
	/**
	 * enable the on screen console
	 */
	enable(): void {
		const consoleNode: Element = document.querySelector('[onscreenconsole-id="panel"]');
		if (!consoleNode) {
			document.body.appendChild(this._consoleNode);
		}
	}
	/**
	 * disable the on screen console
	 */
	disable(): void {
		const consoleNode: Element = document.querySelector('[onscreenconsole-id="panel"]');
		if (consoleNode) {
			this._consoleNode.remove();
		}
	}
	/**
	 * show the on screen console
	 */
	show(): void {
		const consoleNode: Element = document.querySelector('[onscreenconsole-id="panel"]');
		if (consoleNode && this._consoleNode.style.bottom !== '0px') {
      this._consoleNode.style.bottom = '0px';
			(this._consoleNode.children[0] as HTMLElement).style.bottom = '6px';
    }
	}
	/**
	 * hide the on screen console
	 */
	hide(): void {
		const consoleNode: Element = document.querySelector('[onscreenconsole-id="panel"]');
		if (consoleNode && this._consoleNode.style.bottom === '0px') {
			this._consoleNode.style.bottom = (-this._consoleNode.offsetHeight - 10) + 'px';
      (this._consoleNode.children[0] as HTMLElement).style.bottom
        = (-this._consoleNode.offsetHeight - 4) + 'px';
		}
	}
  // others
  /**
	 * supported console methods
	 */
	static get _supportedMethods(): string[] {
		return ['log', 'warn', 'error'];
	}
	/**
	 * colors corresponding to supported methods
	 */
	static get _supportedColors(): {
    log: string
    warn: string
    error: string
  } {
		return {
			log: '#0B1013',
			warn: '#C99833',
			error: '#CB1B45',
		};
	}
	// singleton
	/**
	 * get singleton to ensure only one on screen console panel
	 */
	static get instance() {
		if (!this._instance) {
			this._instance = new OnScreenConsole();
		}
		return this._instance;
	}
}

const oConsole: OnScreenConsole = OnScreenConsole.instance;

// bind oConsole on window
(window as any).oConsole = oConsole;

export default oConsole;
