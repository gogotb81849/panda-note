#!/usr/bin/env python
# -*- coding: utf-8 -*-
from scripts.ssh_client import connect_ssh, run_ssh_cmd

ssh = connect_ssh()

print('=== 测试公网访问哈希接口 ===')
ok, out, err = run_ssh_cmd(ssh, 'curl -s http://106.14.57.62/api/version/hash')
print('公网哈希接口:', out if ok else err)

print('\n=== 测试公网访问检查更新接口 ===')
ok, out, err = run_ssh_cmd(ssh, 'curl -s -X POST http://106.14.57.62/api/version/check-hash -H "Content-Type: application/json" -d \'{"clientHash":""}\'')
print('公网检查更新接口:', out if ok else err)

print('\n=== 测试前端首页 ===')
ok, out, err = run_ssh_cmd(ssh, 'curl -s http://106.14.57.62/')
print('前端首页:', out[:300] if ok else err)

print('\n=== PM2状态 ===')
ok, out, err = run_ssh_cmd(ssh, 'pm2 status')
print('PM2状态:', out if ok else err)

ssh.close()