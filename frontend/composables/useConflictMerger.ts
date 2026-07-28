/**
 * 字段级冲突合并工具
 * 自动合并本地和服务器数据，仅当同一字段都被修改时才标记为冲突
 */

export interface MergeResult {
  success: boolean;
  data?: any;
  conflicts?: FieldConflict[];
  mergedFields?: string[];
  serverOnlyFields?: string[];
  clientOnlyFields?: string[];
}

export interface FieldConflict {
  field: string;
  localValue: any;
  serverValue: any;
  localUpdated: boolean;
  serverUpdated: boolean;
}

/**
 * 比较两个值是否相等（支持深比较）
 */
function isEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!isEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * 获取对象的基版本（用于判断字段是否被修改）
 * 如果 localBase 不存在，则假设所有本地字段都是新修改的
 */
function getFieldChanges(
  current: any,
  base: any
): Map<string, boolean> {
  const changes = new Map<string, boolean>();
  const keys = new Set([...Object.keys(current), ...Object.keys(base || {})]);

  for (const key of keys) {
    // 忽略元数据字段
    if (key.startsWith('_') || key === 'updatedAt' || key === 'createdAt') {
      continue;
    }
    changes.set(key, !isEqual(current[key], base?.[key]));
  }

  return changes;
}

/**
 * 尝试自动合并本地和服务器数据
 *
 * 合并规则：
 * 1. 本地修改了，服务器没修改 → 采用本地值
 * 2. 服务器修改了，本地没修改 → 采用服务器值
 * 3. 双方都修改了，且值相同 → 采用任意一方（值相同）
 * 4. 双方都修改了，且值不同 → 标记为字段冲突
 * 5. 字段只在本地存在 → 保留
 * 6. 字段只在服务器存在 → 保留
 */
export function mergeFields(
  localData: any,
  serverData: any,
  localBase?: any,
  serverBase?: any
): MergeResult {
  if (!localData || !serverData) {
    return { success: false };
  }

  const merged: any = { ...serverData };
  const conflicts: FieldConflict[] = [];
  const mergedFields: string[] = [];
  const serverOnlyFields: string[] = [];
  const clientOnlyFields: string[] = [];

  // 获取本地和服务器的字段变更情况
  const localChanges = getFieldChanges(localData, localBase);
  const serverChanges = getFieldChanges(serverData, serverBase);

  // 获取所有字段
  const allFields = new Set([
    ...Object.keys(localData),
    ...Object.keys(serverData),
  ]);

  for (const field of allFields) {
    // 忽略元数据字段
    if (field.startsWith('_') || field === 'updatedAt' || field === 'createdAt' || field === 'id') {
      continue;
    }

    const localValue = localData[field];
    const serverValue = serverData[field];
    const localModified = localChanges.get(field) || false;
    const serverModified = serverChanges.get(field) || false;

    // 字段只在本地存在
    if (!(field in serverData)) {
      merged[field] = localValue;
      clientOnlyFields.push(field);
      continue;
    }

    // 字段只在服务器存在
    if (!(field in localData)) {
      merged[field] = serverValue;
      serverOnlyFields.push(field);
      continue;
    }

    // 双方都未修改，采用服务器值（默认）
    if (!localModified && !serverModified) {
      merged[field] = serverValue;
      mergedFields.push(field);
      continue;
    }

    // 本地修改了，服务器没修改 → 采用本地值
    if (localModified && !serverModified) {
      merged[field] = localValue;
      mergedFields.push(field);
      continue;
    }

    // 服务器修改了，本地没修改 → 采用服务器值
    if (!localModified && serverModified) {
      merged[field] = serverValue;
      mergedFields.push(field);
      continue;
    }

    // 双方都修改了
    if (localModified && serverModified) {
      // 值相同 → 采用任意一方
      if (isEqual(localValue, serverValue)) {
        merged[field] = serverValue;
        mergedFields.push(field);
        continue;
      }

      // 值不同 → 标记为冲突
      conflicts.push({
        field,
        localValue,
        serverValue,
        localUpdated: true,
        serverUpdated: true,
      });
    }
  }

  // 如果有字段冲突，返回冲突信息
  if (conflicts.length > 0) {
    return {
      success: false,
      data: merged,
      conflicts,
      mergedFields,
      serverOnlyFields,
      clientOnlyFields,
    };
  }

  // 完全自动合并成功
  return {
    success: true,
    data: merged,
    mergedFields,
    serverOnlyFields,
    clientOnlyFields,
  };
}

/**
 * 对文本内容进行简单的三向合并（基于行）
 * 适用于长文本字段（如日记内容、备注等）
 */
export function mergeTextContent(
  base: string,
  local: string,
  server: string
): { success: boolean; merged?: string; hasConflict: boolean } {
  if (local === server) {
    return { success: true, merged: local, hasConflict: false };
  }

  if (local === base) {
    return { success: true, merged: server, hasConflict: false };
  }

  if (server === base) {
    return { success: true, merged: local, hasConflict: false };
  }

  // 简单行级合并：如果本地和服务器修改的是不同行，尝试合并
  const baseLines = base.split('\n');
  const localLines = local.split('\n');
  const serverLines = server.split('\n');

  const mergedLines: string[] = [];
  let hasConflict = false;

  const maxLines = Math.max(baseLines.length, localLines.length, serverLines.length);

  for (let i = 0; i < maxLines; i++) {
    const baseLine = baseLines[i];
    const localLine = localLines[i];
    const serverLine = serverLines[i];

    // 本地没修改这一行
    if (localLine === baseLine || localLine === undefined) {
      mergedLines.push(serverLine || '');
      continue;
    }

    // 服务器没修改这一行
    if (serverLine === baseLine || serverLine === undefined) {
      mergedLines.push(localLine || '');
      continue;
    }

    // 双方都修改了，且值相同
    if (localLine === serverLine) {
      mergedLines.push(localLine);
      continue;
    }

    // 双方都修改了，且值不同 → 冲突
    hasConflict = true;
    mergedLines.push(`<<<<<<< 本地\n${localLine}\n=======\n${serverLine}\n>>>>>>> 服务器`);
  }

  if (hasConflict) {
    return {
      success: false,
      merged: mergedLines.join('\n'),
      hasConflict: true,
    };
  }

  return {
    success: true,
    merged: mergedLines.join('\n'),
    hasConflict: false,
  };
}

/**
 * 智能合并：自动检测字段类型并选择合适的合并策略
 */
export function smartMerge(
  localData: any,
  serverData: any,
  localBase?: any,
  serverBase?: any,
  textFields: string[] = ['content', 'description', 'notes', 'remark', 'text']
): MergeResult & { textConflicts?: Array<{ field: string; localValue: string; serverValue: string; mergedValue: string }> } {
  const result = mergeFields(localData, serverData, localBase, serverBase);

  if (!result.success && result.conflicts) {
    const textConflicts: Array<{ field: string; localValue: string; serverValue: string; mergedValue: string }> = [];
    const remainingConflicts: FieldConflict[] = [];

    for (const conflict of result.conflicts) {
      // 如果是文本字段，尝试文本合并
      if (textFields.includes(conflict.field) &&
          typeof conflict.localValue === 'string' &&
          typeof conflict.serverValue === 'string' &&
          localBase &&
          typeof localBase[conflict.field] === 'string') {
        const textResult = mergeTextContent(
          localBase[conflict.field],
          conflict.localValue,
          conflict.serverValue
        );

        if (textResult.success && !textResult.hasConflict) {
          // 文本合并成功
          if (result.data) {
            result.data[conflict.field] = textResult.merged;
          }
          continue;
        } else if (textResult.merged) {
          // 有冲突但生成了合并视图
          textConflicts.push({
            field: conflict.field,
            localValue: conflict.localValue,
            serverValue: conflict.serverValue,
            mergedValue: textResult.merged,
          });
          continue;
        }
      }

      remainingConflicts.push(conflict);
    }

    if (remainingConflicts.length === 0 && textConflicts.length === 0) {
      return {
        ...result,
        success: true,
      };
    }

    return {
      ...result,
      conflicts: remainingConflicts,
      textConflicts: textConflicts.length > 0 ? textConflicts : undefined,
    };
  }

  return result;
}
