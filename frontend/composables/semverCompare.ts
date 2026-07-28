/**
 * 语义化版本号比较工具
 * 
 * 设计原则（与后端 version.service.ts 保持一致）：
 * 1. 支持 4 段式版本号: major.minor.patch.build，如 "1.1.0.0042"
 * 2. 比较结果只表示 "服务器版本 > 客户端版本" 才返回需要更新
 * 3. 任何解析失败的情况都返回安全值（不触发更新）
 * 
 * ⚠️ 这是防止"从高版本升级到低版本"问题的核心！
 */

export interface VersionParts {
  major: number
  minor: number
  patch: number
  build: number
}

/** 解析版本号字符串为 4 段数字。任何解析失败返回 0 填充。 */
export function parseVersion(version: string | null | undefined): VersionParts {
  if (!version || typeof version !== 'string') {
    return { major: 0, minor: 0, patch: 0, build: 0 }
  }

  // 去除 v 前缀和前后空白
  const cleaned = version.replace(/^v/, '').trim()
  if (!cleaned) {
    return { major: 0, minor: 0, patch: 0, build: 0 }
  }

  const parts = cleaned.split('.').map(part => {
    const n = parseInt(part.trim(), 10)
    return Number.isFinite(n) ? n : 0
  })

  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
    build: parts[3] ?? 0,
  }
}

/**
 * 版本比较返回值：
 *   1: a > b
 *   0: a === b
 *  -1: a < b
 */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a)
  const pb = parseVersion(b)

  if (pa.major !== pb.major) return pa.major > pb.major ? 1 : -1
  if (pa.minor !== pb.minor) return pa.minor > pb.minor ? 1 : -1
  if (pa.patch !== pb.patch) return pa.patch > pb.patch ? 1 : -1
  if (pa.build !== pb.build) return pa.build > pb.build ? 1 : -1
  return 0
}

/**
 * 判断客户端是否需要升级到服务器版本
 * 只有当 serverVersion > clientVersion 时返回 true
 * 
 * 这是"升级提示"决策的唯一标准。
 */
export function shouldUpdate(clientVersion: string, serverVersion: string): boolean {
  return compareVersions(serverVersion, clientVersion) > 0
}

/** 版本号相等 */
export function isSameVersion(a: string, b: string): boolean {
  return compareVersions(a, b) === 0
}

/** 字符串比较版本号（忽略非数字字符），返回 a > b */
export function versionGt(a: string, b: string): boolean {
  return compareVersions(a, b) > 0
}

/** a >= b */
export function versionGte(a: string, b: string): boolean {
  return compareVersions(a, b) >= 0
}
