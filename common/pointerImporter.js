// common/pointerImporter.js
// 指针链导入：解析 + 稳定性验证（支持多种 TXT 格式）

/** 十六进制字符串转数字（安全版） */
function hexToNum(str) {
	if (str === undefined || str === null) return NaN
	const s = String(str).trim().replace(/^0[xX]/, '')
	if (!/^[0-9a-fA-F]+$/.test(s)) return NaN
	return parseInt(s, 16)
}

/** 统一构造中间结构 */
function buildResult(moduleKey, baseHex, offsetHexes, seq, raw) {
	const baseNum = hexToNum(baseHex)
	if (!Number.isFinite(baseNum) || baseNum > Number.MAX_SAFE_INTEGER) return null
	const offsetNums = offsetHexes.map(hexToNum)
	if (offsetNums.some(n => !Number.isFinite(n) || n > Number.MAX_SAFE_INTEGER)) return null

	return {
		baseNum,
		baseHex: '0x' + baseNum.toString(16).toUpperCase(),
		offsetNums,
		offsetHexes: offsetNums.map(n => '0x' + n.toString(16).toUpperCase()),
		seq,
		raw
	}
}

// ================= 格式 B =================
// [12] Schema=2 ... Path: [Sky-iOS-Gold+0x54A3B48] -> +0xC48 -> +0x40 -> +0x5C30
function parseFormatB(line, moduleKey) {
	const seqMatch = line.match(/^\[(\d+)\]/)
	const seq = seqMatch ? parseInt(seqMatch[1], 10) : 0

	const pathIdx = line.indexOf('Path:')
	if (pathIdx === -1) return null
	const pathStr = line.slice(pathIdx + 5).trim()
	const segments = pathStr.split('->').map(s => s.trim())
	if (segments.length < 2) return null

	const firstSeg = segments[0]
	const lb = firstSeg.indexOf('[')
	const rb = firstSeg.lastIndexOf(']')
	if (lb === -1 || rb === -1) return null

	const inner = firstSeg.slice(lb + 1, rb)
	const plusIdx = inner.lastIndexOf('+')
	if (plusIdx === -1) return null

	const modName = inner.slice(0, plusIdx).trim()
	const baseHex = inner.slice(plusIdx + 1).trim()
	if (modName !== moduleKey) return null

	const offsetHexes = []
	for (let i = 1; i < segments.length; i++) {
		let seg = segments[i]
		if (seg.startsWith('+')) seg = seg.slice(1)
		seg = seg.trim()
		if (seg) offsetHexes.push(seg)
	}

	return buildResult(moduleKey, baseHex, offsetHexes, seq, line)
}

// ================= 格式 A =================
// Sky-iOS-Gold+0x529E8D0+0x1300+0x6C44
function parseFormatA(line, moduleKey, seq) {
	const trimmed = line.trim()
	if (!trimmed) return null
	// 必须以 "moduleKey+" 开头（严格）
	if (trimmed.indexOf(moduleKey + '+') !== 0) return null

	const rest = trimmed.slice(moduleKey.length) // 形如 +0x529E8D0+0x1300+0x6C44
	if (!rest.startsWith('+')) return null

	// 按 + 切，过滤空段
	const parts = rest.split('+').map(s => s.trim()).filter(Boolean)
	if (parts.length < 2) return null // 至少 base + 1 offset

	// 每段都必须是合法 hex（去掉 + 后）
	for (const p of parts) {
		if (!/^0[xX][0-9a-fA-F]+$/.test(p)) return null
	}

	const baseHex = parts[0]
	const offsetHexes = parts.slice(1)
	return buildResult(moduleKey, baseHex, offsetHexes, seq, line)
}

/**
 * 解析单行（兼容旧调用：默认按格式 B 解析）
 * 新代码请用 parseText，它会自动识别格式。
 */
export function parseOneLine(line, moduleKey) {
	return parseFormatB(line, moduleKey)
}

/** 从完整文本中解析所有匹配行（自动识别格式 A / B，并去重） */
export function parseText(text, moduleKey = 'Sky-iOS-Gold') {
	const results = []
	const lines = text.split(/\r?\n/)
	let autoSeq = 0

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		if (!line) continue
		if (line.indexOf(moduleKey) === -1) continue

		let r = null

		// 优先格式 B（含 Path:）
		if (line.indexOf('Path:') !== -1) {
			r = parseFormatB(line, moduleKey)
		}
		// 回退格式 A（以 moduleKey+ 开头）
		if (!r) {
			r = parseFormatA(line, moduleKey, ++autoSeq)
		}

		if (r) results.push(r)
	}

	// 去重（同一链可能两种格式混排 / 重复导出）
	const seen = new Set()
	const dedup = []
	for (const r of results) {
		const key = r.baseHex + '|' + r.offsetHexes.join('+')
		if (seen.has(key)) continue
		seen.add(key)
		dedup.push(r)
	}
	return dedup
}

/** 统一转成 UI 展示格式 */
export function toChainPair(r) {
	return {
		baseNum: r.baseNum,
		baseHex: '0x' + r.baseNum.toString(16).toUpperCase(),
		offsetNums: r.offsetNums.slice(),
		offsetHexes: r.offsetNums.map(n => '0x' + n.toString(16).toUpperCase()),
		seq: r.seq
	}
}

// ================= 稳定性验证（保持不变）=================

const ADDR_MIN = 0x100000000
const ADDR_MAX = 0x200000000

function isValidAddr(n) {
	return Number.isFinite(n) && n >= ADDR_MIN && n <= ADDR_MAX
}

export function verifyChain(h5ggRef, mainInfo, item) {
	if (!h5ggRef || !mainInfo || !mainInfo.mainBase) return false
	let addr = Number(mainInfo.mainBase) + item.baseNum
	if (!isValidAddr(addr)) return false

	const chain = item.offsetNums
	try {
		for (let i = 0; i < chain.length - 1; i++) {
			const v = Number(h5ggRef.getValue('0x' + addr.toString(16), 'I64'))
			if (!isValidAddr(v)) return false
			addr = v + chain[i]
			if (!isValidAddr(addr)) return false
		}
		const finalV = Number(h5ggRef.getValue('0x' + addr.toString(16), 'I64'))
		if (!isValidAddr(finalV)) return false
		const finalAddr = finalV + chain[chain.length - 1]
		return isValidAddr(finalAddr)
	} catch (e) {
		return false
	}
}

export async function filterStableChains(items, h5ggRef, getMainFn, onProgress) {
	const mainInfo = getMainFn && getMainFn()

	if (!mainInfo || !h5ggRef) {
		console.log('[filterStableChains] 无 h5gg 环境，跳过验证，返回全部', items.length, '条')
		if (onProgress) onProgress(items.length, items.length, null, true)
		return items.slice()
	}

	const stable = []
	const total = items.length

	for (let i = 0; i < total; i++) {
		const item = items[i]
		const ok = verifyChain(h5ggRef, mainInfo, item)
		if (ok) stable.push(item)

		if (onProgress) onProgress(i + 1, total, item, ok)
		await new Promise(r => setTimeout(r, 0))
	}

	return stable
}

// ================= 文件头校验（改为"宽松模式"）=================

export const REQUIRED_HEADER = 'MemoryTool Pointer Export'

/**
 * 检查文件头。
 * - 旧版：硬校验，不匹配直接拒绝。
 * - 新版：返回 { ok, hasHeader }，让调用方决定是否继续。
 *   因为格式 A（纯 Sky-iOS-Gold+0x... 行）没有文件头，必须放行。
 */
export function checkHeader(text) {
	if (!text) return { ok: false, hasHeader: false }
	const head = text.slice(0, 4096)
	const hasHeader = head.indexOf(REQUIRED_HEADER) !== -1
	// ok = true 表示"可以尝试解析"，具体有没有内容由 parseText 决定
	return { ok: true, hasHeader }
}