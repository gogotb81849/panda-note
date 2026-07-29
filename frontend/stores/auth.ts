import { defineStore } from 'pinia';
import { ElMessage } from 'element-plus';
import type { User, LoginRequest, LoginResponse } from '~/types';

const roleLabels: Record<string, string> = {
  admin: '系统管理员',
  company_admin: '油轮船管部',
  general_manager: '总管团队',
  shore_crew_supervisor: '岸基船工主管',
  shore_marine_supervisor: '岸基海务主管',
  shore_engineer_supervisor: '岸基机务主管',
  shore_electric_supervisor: '岸基电气主管',
  ship_political_instructor: '船舶政委',
};

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: null as string | null,
    refreshToken: null as string | null,
    originalAdminUser: null as User | null,
    originalAdminToken: null as string | null,
    originalAdminRefreshToken: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    userRole: (state) => state.user?.role,
    availableRoles: (state) => {
      const roles = state.user?.roles as string[] | undefined;
      return roles || (state.user?.role ? [state.user.role] : []);
    },
    isImpersonating: (state) => !!state.originalAdminUser,
    isAdmin: (state) => {
      if (state.originalAdminUser) {
        const roles = state.originalAdminUser.roles as string[] | undefined;
        return roles?.includes('admin') || state.originalAdminUser.role === 'admin';
      }
      const roles = state.user?.roles as string[] | undefined;
      return roles?.includes('admin') || state.user?.role === 'admin';
    },
    /** 是否为船舶层面角色（使用航海日记） */
    isShipDiaryRole: (state) => {
      const role = state.user?.role;
      // 船舶层面角色：船舶政委、船长、轮机长等 ship_ 开头的角色
      return role?.startsWith('ship_');
    },
    /** 是否为岸基船管层面角色（使用船管日记） */
    isShoreDiaryRole: (state) => {
      const role = state.user?.role;
      // 岸基船管层面：船工主管、海务主管、机务主管、电气主管、总管、油轮船管部、系统管理员等
      return !role?.startsWith('ship_');
    },
    /** 日记类型名称：船舶层面显示"航海日记"，岸基船管层面显示"船管日记" */
    diaryTypeName: (state) => {
      const role = state.user?.role;
      if (role?.startsWith('ship_')) {
        return '航海日记';
      }
      return '船管日记';
    },
  },

  actions: {
    async login(credentials: LoginRequest) {
      const config = useRuntimeConfig();
      const isSSR = process.server;
      const url = isSSR 
        ? `${config.public.apiBase}/auth/login` 
        : '/api/auth/login';
      
      try {
        const response = await $fetch<LoginResponse>(url, {
          method: 'POST',
          body: credentials,
        });

        this.token = response.access_token;
        this.refreshToken = response.refresh_token || null;
        this.user = response.user;
        this.originalAdminUser = null;
        this.originalAdminToken = null;
        this.originalAdminRefreshToken = null;

        if (process.client) {
          localStorage.setItem('auth_token', response.access_token);
          localStorage.setItem('auth_user', JSON.stringify(response.user));
          localStorage.removeItem('auth_original_admin');
          localStorage.removeItem('auth_original_admin_token');
          localStorage.removeItem('auth_original_admin_refresh');
          if (response.refresh_token) {
            localStorage.setItem('auth_refresh_token', response.refresh_token);
          }
        }

        const loginCookie = useCookie('auth_token', {
          path: '/',
          sameSite: 'lax',
        });
        loginCookie.value = response.access_token;

        return { success: true };
      } catch (error: any) {
        const status = error?.status || error?.response?.status;
        const message = error?.data?.message || error?.response?._data?.message || error?.message || '登录失败';
        return { success: false, status, message };
      }
    },

    async refreshTokenAction() {
      const config = useRuntimeConfig();
      try {
        const storedRefreshToken = process.client ? localStorage.getItem('auth_refresh_token') : this.refreshToken;
        if (!storedRefreshToken) {
          this.logout();
          return false;
        }

        const isSSR = process.server;
        const url = isSSR ? `${config.public.apiBase}/auth/refresh-token` : '/api/auth/refresh-token';
        
        const response = await $fetch<LoginResponse>(url, {
          method: 'POST',
          body: { token: storedRefreshToken },
        });

        this.token = response.access_token;
        this.refreshToken = response.refresh_token || null;
        this.user = response.user;

        if (process.client) {
          localStorage.setItem('auth_token', response.access_token);
          localStorage.setItem('auth_user', JSON.stringify(response.user));
          if (response.refresh_token) {
            localStorage.setItem('auth_refresh_token', response.refresh_token);
          }
        }

        const tokenCookie = useCookie('auth_token', {
          path: '/',
          sameSite: 'lax',
        });
        tokenCookie.value = response.access_token;

        return true;
      } catch (error) {
        this.logout();
        return false;
      }
    },

    async switchRole(targetRole: string, targetUserId?: number) {
      const config = useRuntimeConfig();
      const isSSR = process.server;
      const url = isSSR ? `${config.public.apiBase}/auth/switch-role` : '/api/auth/switch-role';
      try {
        const body: Record<string, any> = { role: targetRole };
        if (targetUserId) {
          body.targetUserId = targetUserId;
        }

        const isCurrentlyImpersonating = !!this.originalAdminUser;
        const currentUser = this.user;
        const currentToken = this.token;
        const currentRefreshToken = this.refreshToken;

        const response = await $fetch<LoginResponse>(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.token}` },
          body,
        });

        this.token = response.access_token;
        this.refreshToken = response.refresh_token || null;
        this.user = response.user;

        if (targetUserId) {
          if (!isCurrentlyImpersonating && currentUser && currentToken) {
            this.originalAdminUser = { ...currentUser };
            this.originalAdminToken = currentToken;
            this.originalAdminRefreshToken = currentRefreshToken;
          }
        }

        if (process.client) {
          localStorage.setItem('auth_token', response.access_token);
          localStorage.setItem('auth_user', JSON.stringify(response.user));
          if (this.originalAdminUser && this.originalAdminToken) {
            localStorage.setItem('auth_original_admin', JSON.stringify(this.originalAdminUser));
            localStorage.setItem('auth_original_admin_token', this.originalAdminToken);
            if (this.originalAdminRefreshToken) {
              localStorage.setItem('auth_original_admin_refresh', this.originalAdminRefreshToken);
            }
          } else {
            localStorage.removeItem('auth_original_admin');
            localStorage.removeItem('auth_original_admin_token');
            localStorage.removeItem('auth_original_admin_refresh');
          }
          if (response.refresh_token) {
            localStorage.setItem('auth_refresh_token', response.refresh_token);
          }
        }

        const tokenCookie = useCookie('auth_token', {
          path: '/',
          sameSite: 'lax',
        });
        tokenCookie.value = response.access_token;

        window.location.href = '/';

        return true;
      } catch (error: any) {
        const status = error?.response?.status || error?.status || error?.statusCode;
        const message = error?.response?._data?.message || error?.message || error?.statusMessage || '未知错误';
        
        if (status === 403) {
          ElMessage.error('没有权限切换到该角色: ' + message);
        } else if (status === 401) {
          ElMessage.error('登录已过期，请重新登录');
          this.logout();
        } else if (status === 404) {
          ElMessage.error('API接口不存在，请检查后端服务');
        } else if (status === 500) {
          ElMessage.error('服务器内部错误: ' + message);
        } else {
          ElMessage.error(`切换角色失败 (状态码: ${status || '未知'}): ${message}`);
        }
        return false;
      }
    },

    stopImpersonating() {
      if (!this.originalAdminUser || !this.originalAdminToken) {
        return false;
      }

      this.user = this.originalAdminUser;
      this.token = this.originalAdminToken;
      this.refreshToken = this.originalAdminRefreshToken;
      this.originalAdminUser = null;
      this.originalAdminToken = null;
      this.originalAdminRefreshToken = null;

      if (process.client) {
        localStorage.setItem('auth_token', this.token);
        localStorage.setItem('auth_user', JSON.stringify(this.user));
        localStorage.removeItem('auth_original_admin');
        localStorage.removeItem('auth_original_admin_token');
        localStorage.removeItem('auth_original_admin_refresh');
        if (this.refreshToken) {
          localStorage.setItem('auth_refresh_token', this.refreshToken);
        } else {
          localStorage.removeItem('auth_refresh_token');
        }
      }

      const tokenCookie = useCookie('auth_token', {
        path: '/',
        sameSite: 'lax',
      });
      tokenCookie.value = this.token;

      window.location.href = '/';

      return true;
    },

    async fetchUsersByRole(): Promise<Record<string, Array<{ id: number; username: string; realName: string; teamCode: string }>>> {
      const config = useRuntimeConfig();
      const isSSR = process.server;
      const url = isSSR ? `${config.public.apiBase}/auth/users-by-role` : '/api/auth/users-by-role';
      try {
        const result = await $fetch<Record<string, Array<{ id: number; username: string; realName: string; teamCode: string }>>>(
          url,
          {
            headers: { Authorization: `Bearer ${this.token}` },
          }
        );
        return result;
      } catch (error) {
        return {};
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      this.refreshToken = null;
      this.originalAdminUser = null;
      this.originalAdminToken = null;
      this.originalAdminRefreshToken = null;
      
      if (process.client) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_refresh_token');
        localStorage.removeItem('auth_original_admin');
        localStorage.removeItem('auth_original_admin_token');
        localStorage.removeItem('auth_original_admin_refresh');
      }
      
      const tokenCookie = useCookie('auth_token');
      tokenCookie.value = null;
      
      window.location.href = '/login';
    },

    async fetchUser() {
      if (!this.token) return;
      const config = useRuntimeConfig();
      const isSSR = process.server;
      const url = isSSR ? `${config.public.apiBase}/auth/profile` : '/api/auth/profile';
      try {
        const response = await $fetch<User>(url, {
          headers: { Authorization: `Bearer ${this.token}` },
        });
        this.user = response;
        
        if (process.client && response) {
          localStorage.setItem('auth_user', JSON.stringify(response));
        }
      } catch (error) {
        // Token无效，清除状态
        this.token = null;
        this.user = null;
        if (process.client) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
      }
    },

    async checkAuth() {
      if (process.client) {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');
        const storedRefreshToken = localStorage.getItem('auth_refresh_token');
        const storedOriginalAdmin = localStorage.getItem('auth_original_admin');
        const storedOriginalAdminToken = localStorage.getItem('auth_original_admin_token');
        const storedOriginalAdminRefresh = localStorage.getItem('auth_original_admin_refresh');
        if (storedToken) {
          this.token = storedToken;
          this.refreshToken = storedRefreshToken || null;
          if (storedUser) {
            try {
              this.user = JSON.parse(storedUser);
            } catch (e) {
              this.token = null;
              this.user = null;
              this.refreshToken = null;
              this.originalAdminUser = null;
              this.originalAdminToken = null;
              this.originalAdminRefreshToken = null;
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
              localStorage.removeItem('auth_refresh_token');
              localStorage.removeItem('auth_original_admin');
              localStorage.removeItem('auth_original_admin_token');
              localStorage.removeItem('auth_original_admin_refresh');
              return;
            }
          }
          if (storedOriginalAdmin && storedOriginalAdminToken) {
            try {
              this.originalAdminUser = JSON.parse(storedOriginalAdmin);
              this.originalAdminToken = storedOriginalAdminToken;
              this.originalAdminRefreshToken = storedOriginalAdminRefresh || null;
            } catch (e) {
              this.originalAdminUser = null;
              this.originalAdminToken = null;
              this.originalAdminRefreshToken = null;
              localStorage.removeItem('auth_original_admin');
              localStorage.removeItem('auth_original_admin_token');
              localStorage.removeItem('auth_original_admin_refresh');
            }
          }
          const config = useRuntimeConfig();
          const isSSR = process.server;
          const url = isSSR ? `${config.public.apiBase}/auth/profile` : '/api/auth/profile';
          try {
            const response = await $fetch<User>(url, {
              headers: { Authorization: `Bearer ${this.token}` },
            });
            this.user = response;
            localStorage.setItem('auth_user', JSON.stringify(response));
          } catch (error: any) {
            const status = error?.status || error?.response?.status;
            if (status === 429) {
              return;
            }
            // 401 才清除，网络错误保留本地登录（离线可用）
            if (status === 401) {
              if (this.refreshToken) {
                const refreshed = await this.refreshTokenAction();
                if (refreshed) return;
              }
              this.token = null;
              this.user = null;
              this.refreshToken = null;
              this.originalAdminUser = null;
              this.originalAdminToken = null;
              this.originalAdminRefreshToken = null;
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
              localStorage.removeItem('auth_refresh_token');
              localStorage.removeItem('auth_original_admin');
              localStorage.removeItem('auth_original_admin_token');
              localStorage.removeItem('auth_original_admin_refresh');
            }
            // 其他错误（网络错误等）：保留本地登录状态，离线可用
          }
          return;
        }
      }

      const tokenCookie = useCookie('auth_token');
      if (tokenCookie.value) {
        this.token = tokenCookie.value;
        const config = useRuntimeConfig();
        const isSSR = process.server;
        const url = isSSR ? `${config.public.apiBase}/auth/profile` : '/api/auth/profile';
        try {
          const response = await $fetch<User>(url, {
            headers: { Authorization: `Bearer ${this.token}` },
          });
          this.user = response;
          if (process.client) {
            localStorage.setItem('auth_token', this.token);
            localStorage.setItem('auth_user', JSON.stringify(response));
          }
        } catch (error: any) {
          const status = error?.status || error?.response?.status;
          if (status === 429) {
            return;
          }
          // 401 才清除，网络错误保留本地登录（离线可用）
          if (status === 401) {
            this.token = null;
            this.user = null;
            tokenCookie.value = null;
          }
        }
      }
    },
  },
});