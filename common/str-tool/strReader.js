// 地图名/任意门字符串专用：只认 [A-Za-z0-9_]
const MAX_LEN = 32

function isMapChar(b) {
    return (b >= 0x30 && b <= 0x39) ||   // 0-9
        (b >= 0x41 && b <= 0x5A) ||   // A-Z
        (b >= 0x61 && b <= 0x7A) ||   // a-z
        b === 0x5F                     // _
}

/**
 * 从指定内存地址读取地图名称
 * @param {string} addrStr - 内存地址的字符串表示，例如 "0x12345678"
 * @param {number} [maxBytes=MAX_LEN] - 最大读取字节数，默认为 MAX_LEN
 * @returns {string} - 读取到的地图名称，如果读取失败则返回空字符串
 */
export function readMapName(addrStr, maxBytes = MAX_LEN) {
    // 检查 h5gg 对象是否存在，如果不存在则返回空字符串
    if (typeof h5gg === 'undefined') return ''

    // 检查地址参数是否有效，如果无效则返回空字符串
    if (!addrStr) return ''

    // 将地址字符串转换为 BigInt 类型，以便进行地址计算
    let addr
    try {
        addr = BigInt(addrStr)
    } catch (e) {
        return ''  // 如果转换失败，返回空字符串
    }

    // 用于存储读取到的字符串
    let out = ''

    // 循环读取内存中的每个字节
    for (let i = 0; i < maxBytes; i++) {
        let b  // 用于存储当前读取的字节

        try {
            // 从指定地址读取一个无符号8位整数
            // 地址计算：addr + i，转换为16进制字符串并添加 '0x' 前缀
            b = Number(h5gg.getValue('0x' + (addr + BigInt(i)).toString(16), 'U8'))
        } catch (e) {
            break  // 如果读取失败，跳出循环
        }

        // 检查读取的值是否有效
        if (!Number.isFinite(b)) break

        // 确保字节数值在0-255范围内
        b &= 0xFF

        // 如果遇到空字符（字符串结束符），停止读取
        if (b === 0) break

        // 检查字符是否为有效的地图名称字符
        if (!isMapChar(b)) break

        // 将字节转换为字符并添加到结果字符串中
        out += String.fromCharCode(b)
    }
    // 返回读取到的地图名称
    return out
}

