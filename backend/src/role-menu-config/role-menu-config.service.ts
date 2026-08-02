import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode, UserRole } from '@prisma/client';

// 默认菜单定义（所有可用的菜单项）
export const ALL_MENU_ITEMS = [
  { menuKey: '/', label: '工作台', icon: 'dashboard' },
  { menuKey: '/publish-v2', label: '任务发布', icon: 'publish' },
  { menuKey: '/dashboard', label: '船工看板', icon: 'data-board' },
  { menuKey: '/schedule', label: '日程管理', icon: 'calendar' },
  { menuKey: '/tasks', label: '工作任务', icon: 'log' },
  { menuKey: '/gantt', label: '甘特图', icon: 'gantt' },
  { menuKey: '/crew-list', label: '船员管理', icon: 'crew' },
  { menuKey: '/staff-assignments', label: '人员派任', icon: 'user' },
  { menuKey: '/sop-flow', label: 'SOP流程', icon: 'flow' },
  { menuKey: '/public-case', label: '案例库', icon: 'case' },
  { menuKey: '/experiences', label: '经验分享', icon: 'ai' },
  { menuKey: '/files', label: '共享文件', icon: 'files' },
  { menuKey: '/ai-report', label: 'AI简报', icon: 'ai' },
  { menuKey: '/port-check', label: '抵港前检查', icon: 'ship' },
  { menuKey: '/staff-history', label: '人员履历', icon: 'user' },
  { menuKey: '/party-activities', label: '党建活动', icon: 'calendar' },
  { menuKey: '/thought-reports', label: '思想动态', icon: 'search' },
  { menuKey: '/integrity-records', label: '廉洁监督', icon: 'case' },
  { menuKey: '/officer-profiles', label: '政委履职档案', icon: 'user' },
  { menuKey: '/toolbox', label: '工具箱', icon: 'toolbox' },
  { menuKey: '/admin', label: '系统管理', icon: 'admin' },
];

// 各角色默认启用的菜单配置
const DEFAULT_ROLE_MENUS: Record<string, string[]> = {
  admin: [
    '/', '/publish-v2', '/schedule', '/tasks', '/gantt',
    '/crew-list', '/staff-assignments', '/sop-flow', '/public-case',
    '/experiences', '/files', '/ai-report', '/toolbox', '/admin',
  ],
  shore_crew_supervisor: [
    '/', '/publish-v2', '/dashboard', '/schedule',
    '/tasks', '/gantt', '/crew-list', '/staff-assignments',
    '/port-check', '/staff-history', '/sop-flow', '/public-case',
    '/experiences', '/files', '/toolbox', '/admin',
  ],
  ship_political_instructor: [
    '/', '/crew-list', '/schedule', '/tasks',
    '/gantt', '/staff-assignments',
    '/party-activities', '/thought-reports', '/integrity-records',
    '/officer-profiles', '/staff-history',
    '/experiences', '/files', '/ai-report', '/toolbox',
  ],
  shore_marine_supervisor: [
    '/', '/schedule', '/tasks', '/gantt',
    '/crew-list', '/staff-assignments', '/port-check',
    '/staff-history', '/sop-flow', '/public-case',
    '/experiences', '/files', '/toolbox',
  ],
  shore_engineer_supervisor: [
    '/', '/schedule', '/tasks', '/gantt',
    '/crew-list', '/staff-assignments', '/port-check',
    '/staff-history', '/sop-flow', '/public-case',
    '/experiences', '/files', '/toolbox',
  ],
  shore_electric_supervisor: [
    '/', '/schedule', '/tasks', '/gantt',
    '/crew-list', '/staff-assignments', '/port-check',
    '/staff-history', '/sop-flow', '/public-case',
    '/experiences', '/files', '/toolbox',
  ],
  general_manager: [
    '/', '/schedule', '/tasks', '/gantt',
    '/crew-list', '/staff-assignments', '/port-check',
    '/staff-history', '/sop-flow', '/public-case',
    '/experiences', '/files', '/toolbox',
  ],
  company_admin: [
    '/', '/schedule', '/tasks', '/gantt',
    '/crew-list', '/staff-assignments', '/port-check',
    '/staff-history', '/sop-flow', '/public-case',
    '/experiences', '/files', '/toolbox',
  ],
};

@Injectable()
export class RoleMenuConfigService {
  private readonly logger = new Logger(RoleMenuConfigService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 获取指定角色的菜单配置（从数据库读取，返回排序后的菜单列表）
   * 如果数据库中缺少新添加的菜单项，自动补充
   */
  async getRoleMenus(teamCode: TeamCode, role: UserRole): Promise<{ menuKey: string; label: string; icon: string | null; enabled: boolean; sortOrder: number }[]> {
    const configs = await this.prisma.roleMenuConfig.findMany({
      where: { teamCode, role },
      orderBy: { sortOrder: 'asc' },
    });

    // 如果数据库中没有配置，返回默认配置
    if (configs.length === 0) {
      return this.getDefaultMenus(role);
    }

    // 检查是否有缺失的菜单项，如果有则自动补充
    const existingKeys = new Set(configs.map(c => c.menuKey));
    const missingItems = ALL_MENU_ITEMS.filter(item => !existingKeys.has(item.menuKey));
    
    if (missingItems.length > 0) {
      this.logger.log(`检测到 ${missingItems.length} 个新菜单项，正在补充到 ${teamCode}/${role} 的菜单配置中`);
      const defaultMenus = this.getDefaultMenus(role);
      const maxSortOrder = Math.max(...configs.map(c => c.sortOrder), 0);
      
      for (let i = 0; i < missingItems.length; i++) {
        const item = missingItems[i];
        const defaultItem = defaultMenus.find(d => d.menuKey === item.menuKey);
        await this.prisma.roleMenuConfig.create({
          data: {
            teamCode,
            role,
            menuKey: item.menuKey,
            label: item.label,
            icon: item.icon,
            enabled: defaultItem?.enabled ?? false,
            sortOrder: maxSortOrder + i + 1,
          },
        });
      }
      
      // 重新读取
      const updatedConfigs = await this.prisma.roleMenuConfig.findMany({
        where: { teamCode, role },
        orderBy: { sortOrder: 'asc' },
      });
      
      return updatedConfigs.map(c => ({
        menuKey: c.menuKey,
        label: c.label,
        icon: c.icon,
        enabled: c.enabled,
        sortOrder: c.sortOrder,
      }));
    }

    return configs.map(c => ({
      menuKey: c.menuKey,
      label: c.label,
      icon: c.icon,
      enabled: c.enabled,
      sortOrder: c.sortOrder,
    }));
  }

  /**
   * 获取当前用户角色的菜单（仅返回启用的）
   * 注意：杂志编排只在工具箱中显示，不在左侧菜单中显示
   */
  async getMyMenus(teamCode: TeamCode, role: UserRole): Promise<{ path: string; label: string; icon: string }[]> {
    const configs = await this.getRoleMenus(teamCode, role);
    return configs
      .filter(c => c.enabled && c.menuKey !== '/magazine' && c.menuKey !== '/diary')
      .map(c => ({ path: c.menuKey, label: c.label, icon: c.icon || '' }));
  }

  /**
   * 管理员获取所有角色的菜单配置
   */
  async getAllRoleMenus(teamCode: TeamCode) {
    const roles = Object.values(UserRole);
    const result: Record<string, any[]> = {};

    for (const role of roles) {
      result[role] = await this.getRoleMenus(teamCode, role);
    }

    return result;
  }

  /**
   * 管理员更新指定角色的菜单配置
   */
  async updateRoleMenus(
    teamCode: TeamCode,
    role: UserRole,
    menus: { menuKey: string; enabled: boolean; sortOrder?: number }[],
  ) {
    const results = [];
    for (const menu of menus) {
      const menuDef = ALL_MENU_ITEMS.find(m => m.menuKey === menu.menuKey);
      if (!menuDef) continue;

      const result = await this.prisma.roleMenuConfig.upsert({
        where: {
          teamCode_role_menuKey: { teamCode, role, menuKey: menu.menuKey },
        },
        create: {
          teamCode,
          role,
          menuKey: menu.menuKey,
          label: menuDef.label,
          icon: menuDef.icon,
          enabled: menu.enabled,
          sortOrder: menu.sortOrder ?? 0,
        },
        update: {
          enabled: menu.enabled,
          sortOrder: menu.sortOrder ?? 0,
        },
      });
      results.push(result);
    }
    return results;
  }

  /**
   * 获取默认菜单（基于角色）
   */
  private getDefaultMenus(role: UserRole) {
    const enabledKeys = DEFAULT_ROLE_MENUS[role] || ['/', '/schedule', '/tasks', '/files'];
    return ALL_MENU_ITEMS.map((item, index) => ({
      menuKey: item.menuKey,
      label: item.label,
      icon: item.icon,
      enabled: enabledKeys.includes(item.menuKey),
      sortOrder: index,
    }));
  }

  /**
   * 初始化所有角色的默认菜单配置到数据库
   */
  async seedDefaultMenus(teamCode: TeamCode) {
    const roles = Object.values(UserRole);
    let count = 0;

    for (const role of roles) {
      const enabledKeys = DEFAULT_ROLE_MENUS[role] || [];
      for (let i = 0; i < ALL_MENU_ITEMS.length; i++) {
        const item = ALL_MENU_ITEMS[i];
        try {
          await this.prisma.roleMenuConfig.upsert({
            where: {
              teamCode_role_menuKey: { teamCode, role, menuKey: item.menuKey },
            },
            create: {
              teamCode,
              role,
              menuKey: item.menuKey,
              label: item.label,
              icon: item.icon,
              enabled: enabledKeys.includes(item.menuKey),
              sortOrder: i,
            },
            update: {
              label: item.label,
              icon: item.icon,
              enabled: enabledKeys.includes(item.menuKey),
              sortOrder: i,
            },
          });
          count++;
        } catch (error) {
          this.logger.warn(`种子菜单失败 ${role}/${item.menuKey}: ${error.message}`);
        }
      }
    }
    this.logger.log(`菜单配置初始化完成: ${count} 条`);
    return { count };
  }
}