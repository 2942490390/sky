// common/test/test-anydoor.js
// 任意门测试文件 —— 直接运行，无需页面

import {
    initAnyDoor,
    goMapAnyDoor,
    writeAnyDoorCode,
    triggerAnyDoor,
    readCurrentAnyDoorCode,
    clearAnyDoorCache
} from '../features/warp.js'
import { customDelay } from '../h5gg.js'

function log(...args) { console.log('[AnyDoor-Test]', ...args) }
function err(...args) { console.error('[AnyDoor-Test]', ...args) }

// ============================================================
// 测试1：初始化
// ============================================================
async function testInit() {
    log('===== 测试1：初始化 =====')
    const ok = await initAnyDoor()
    log(ok ? '✅ 初始化成功' : '❌ 初始化失败')
    return ok
}

// ============================================================
// 测试2：仅写入字符串（不触发，安全）
// ============================================================
async function testWriteOnly(code = 'CandleSpace') {
    log('===== 测试2：仅写入 =====', code)
    if (!await initAnyDoor()) { err('❌ 初始化失败'); return false }

    const before = readCurrentAnyDoorCode()
    log('写入前:', JSON.stringify(before))

    const ok = writeAnyDoorCode(code)
    const after = readCurrentAnyDoorCode()
    log('写入后:', JSON.stringify(after))

    const pass = ok && after === code
    log(pass ? '✅ 写入验证通过' : '❌ 写入验证失败')
    return pass
}

// ============================================================
// 测试3：完整传送（写字符串 + 触发）
// ============================================================
async function testWarp(code = 'CandleSpace') {
    log('===== 测试3：完整传送 =====', code)
    if (!await initAnyDoor()) { err('❌ 初始化失败'); return false }

    const before = readCurrentAnyDoorCode()
    log('传送前:', JSON.stringify(before))

    const res = await goMapAnyDoor(code)
    log('goMapAnyDoor 返回:', res)

    await customDelay(2000)
    const after = readCurrentAnyDoorCode()
    log('传送后:', JSON.stringify(after))

    log(res.success ? '✅ 传送指令下发成功' : '❌ 传送失败: ' + res.reason)
    return res.success
}

// ============================================================
// 测试4：手动分步（先写，再触发）
// ============================================================
async function testManualTrigger(code = 'Dawn') {
    log('===== 测试4：手动分步触发 =====', code)
    if (!await initAnyDoor()) { err('❌ 初始化失败'); return false }

    const writeOk = writeAnyDoorCode(code)
    log('步骤1 写入:', writeOk, '读回:', readCurrentAnyDoorCode())
    if (!writeOk) return false

    await customDelay(300)
    const trigOk = triggerAnyDoor()
    log('步骤2 触发:', trigOk)

    const pass = writeOk && trigOk
    log(pass ? '✅ 分步触发成功' : '❌ 分步触发失败')
    return pass
}

// ============================================================
// 测试5：非法参数
// ============================================================
async function testInvalidArgs() {
    log('===== 测试5：非法参数 =====')
    const cases = [null, '', 123, 'has space', 'has-dash', 'a'.repeat(40)]
    let allPass = true
    for (const c of cases) {
        const res = await goMapAnyDoor(c)
        const rejected = !res.success
        log(`  参数 ${JSON.stringify(c)} → 拒绝: ${rejected} (${res.reason})`)
        if (!rejected) allPass = false
    }
    log(allPass ? '✅ 非法参数全部被拒绝' : '❌ 存在未拒绝的非法参数')
    return allPass
}

// ============================================================
// 测试6：缓存清理后重新初始化
// ============================================================
async function testCacheClear() {
    log('===== 测试6：缓存清理 =====')
    clearAnyDoorCache()
    log('缓存已清理')
    const ok = await initAnyDoor()
    log(ok ? '✅ 清理后重新初始化成功' : '❌ 清理后重新初始化失败')
    return ok
}

// ============================================================
// 测试7：批量传送
// ============================================================
async function testBatch(codes = ['CandleSpace', 'Dawn', 'Rain']) {
    log('===== 测试7：批量传送 =====', codes)
    const results = []
    for (const code of codes) {
        const ok = await testWarp(code)
        results.push({ code, ok })
        await customDelay(3000)
    }
    log('批量结果:')
    results.forEach(r => log(`  ${r.code}: ${r.ok ? '✅' : '❌'}`))
    const allOk = results.every(r => r.ok)
    log(allOk ? '✅ 批量全部通过' : '❌ 批量存在失败项')
    return results
}

// ============================================================
// 一键跑全部
// ============================================================
async function runAllTests() {
    log('########## 全量测试开始 ##########')
    const summary = {}

    summary.init = await testInit()
    await customDelay(500)

    summary.writeOnly = await testWriteOnly('CandleSpace') // 测试写入字符串（不触发）
    await customDelay(500)

    summary.invalidArgs = await testInvalidArgs() // 测试非法参数
    await customDelay(500)

    summary.cacheClear = await testCacheClear() // 测试缓存清理
    await customDelay(500)

    summary.warp = await testWarp('CandleSpace') // 测试完整传送
    await customDelay(3000)

    summary.manual = await testManualTrigger('Dawn') // 测试手动分步触发
    await customDelay(3000)

    log('########## 测试汇总 ##########')
    for (const [k, v] of Object.entries(summary)) {
        log(`  ${k}: ${v ? '✅' : '❌'}`)
    }
    const allPass = Object.values(summary).every(Boolean)
    log(allPass ? '🎉 全部测试通过' : '⚠️ 存在失败项')
    return summary
}

// ============================================================
// 自执行入口 —— 导入即跑
// ============================================================
// runAllTests().catch(e => err('测试异常:', e))

// 需要单独调用时 export 出去
export {
    testInit,
    testWriteOnly,
    testWarp,
    testManualTrigger,
    testInvalidArgs,
    testCacheClear,
    testBatch,
    runAllTests
}