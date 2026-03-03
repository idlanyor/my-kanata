import { platform, release } from 'os'
import { proto } from '../../WAProto/index.js'
import type { BrowsersMap } from '../Types'

const PLATFORM_MAP = {
	aix: 'AIX',
	darwin: 'Mac OS',
	win32: 'Windows',
	android: 'Android',
	freebsd: 'FreeBSD',
	openbsd: 'OpenBSD',
	sunos: 'Solaris',
	linux: undefined,
	haiku: undefined,
	cygwin: undefined,
	netbsd: undefined
}

export const Browsers: BrowsersMap = {
	ubuntu: browser => ['Ubuntu', browser, '22.04.4'],
	macOS: browser => ['Mac OS', browser, '14.4.1'],
	baileys: browser => ['Baileys', browser, '6.5.0'],
	windows: browser => ['Windows', browser, '10.0.22631'],
	/** The appropriate browser based on your OS & release */
	appropriate: browser => [PLATFORM_MAP[platform()] || 'Ubuntu', browser, release()],
	/** Custom NASA logo preset */
	nasa: (browser: string) => ['Nasa Apollo Space', browser, '14.4.1']
}

export const getPlatformId = (browser: string) => {
	const parts = browser.split('|')
	const forcedLogo = (parts.length > 1 && parts[1] ? parts[1] : browser).trim().toUpperCase()
	const platformType = proto.DeviceProps.PlatformType[forcedLogo as any]
	return platformType !== undefined ? platformType.toString() : '1' //chrome
}