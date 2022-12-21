declare const mp: any;

namespace mpv {
	export interface OsdOverlay {
		data: string
		update(): void
		remove(): void
	}

	export interface Track {
		// NOTE: incomplete
		id: string
		type: string
	}

	export interface Chapter {
		title: string
		time: number
	}

	export const createASS = (): OsdOverlay => mp.create_osd_overlay('ass-events');

	export interface SubprocessResult {
		error_string: string
		status: number
		stdout: string
		stderr: string
	}

	export const runProcess = (args: string[], cb: (stdout?: string, error?: string) => void) => {
		mp.command_native_async({
			name: 'subprocess',
			args,
			playback_only: false,
			capture_stdout: true,
			capture_stderr: true,
		}, (_success: boolean, result: SubprocessResult) => {
			if (result.error_string) {
				cb(undefined, 'subprocess failed: ' + result.error_string);
			} else if (result.status !== 0) {
				cb(undefined, 'status code: ' + result.status + ', stderr: ' + result.stderr);
			} else {
				cb(result.stdout, undefined);
			}
		});
	};
}

const util = {
	clamp: (n: number, min: number, max: number) => n < min ? min : (n > max ? max : n),
	padTwoZero: (s: string) => s.length === 1 ? ('0' + s) : s,
	hhmmss(s: number, forceH?: boolean) {
		const h = Math.floor(s / 3600);
		s %= 3600;
		const m = Math.floor(s / 60);
		s = Math.floor(s % 60);
		return (h > 0 || forceH ? util.padTwoZero(h + '') + ':' : '')
				+ util.padTwoZero(m + '') + ':' + util.padTwoZero(s + '');
	},
	repeat(s: string, n: number): string {
		let str = '';
		while (n--) {
			str += s;
		}
		return str;
	},
	hex(n: number): string {
		return n < 16 ? '0' + n.toString(16) : n.toString(16);
	},
	endsWith(str: string, needle: string): boolean {
		return str.substring(str.length - needle.length, str.length) === needle;
	},
};

const enum AssAlignment {
	Reset = 0,
	BottomLeft = 1,
	BottomCenter = 2,
	BottomRight = 3,
	MiddleLeft = 4,
	MiddleCenter = 5,
	MiddleRight = 6,
	TopLeft = 7,
	TopCenter = 8,
	TopRight = 9,
}

interface AssOptions {
	b?: boolean,
	i?: boolean,
	u?: boolean,
	s?: boolean,
	bord?: number,
	shad?: number,
	fn?: string,
	fs?: number,
	an?: AssAlignment,

	color?: {
		r: number,
		g: number,
		b: number,
		a: number,
	},
}

class AssDraw {
	// http://www.tcax.org/docs/ass-specs.htm
	overlay = mpv.createASS();
	colorStr = '';
	buf = '';
	destroy() {
		this.overlay.remove();
	}
	start() {
		this.buf = '';
	}
	end() {
		this.overlay.data = this.buf;
		this.overlay.update();
		this.buf = '';
	}
	raw(raw: string) {
		this.buf += raw;
	}
	text(str: string) {
		this.buf += str.replace(/\\/g, '\\\\').replace(/([{}])/g, '\\$1').replace(/\n/g, '\\N');
	}
	private part(str: string) {
		this.buf += `{\\bord0\\shad0\\pos(0,0)\\p1}${str}{\\p0}`;
	}
	rect(x: number, y: number, w: number, h: number) {
		this.part(`m ${x} ${y} l ${x + w} ${y} ${x + w} ${y + h} ${x} ${y + h}`);
	}
	setOptions(options: AssOptions) {
		this.buf += '{' + Object.keys(options).map(k => {
			if (k === 'color') {
				return `\\c&H${util.hex(options.color!!.b)}${util.hex(options.color!!.g)}${util.hex(options.color!!.r)}&\\1a&H${util.hex(255 - options.color!!.a)}&`;
			} else {
				const v = options[k as keyof AssOptions];
				return `\\${k}${typeof v === 'boolean' ? (v ? '1' : '0') : v}`;
			}
		}).join('') + '}';
	}
}