-- 船舶-主管映射表更新脚本
-- 根据 2026-06-17 第二总管团队主管分配表
-- 排除"待调离"的人员

-- 更新船舶主管信息
-- 海务主管映射
UPDATE ship SET marineSupervisor = '程奇' WHERE cnShipName IN ('连杉湖', '连桂湖', '连欢湖', '连囍湖', '连乐湖', '远菊湾');
UPDATE ship SET marineSupervisor = '许可' WHERE cnShipName IN ('梅林湾', '楠林湾', '榕林湾', '远莲湾', '远兰湾');
UPDATE ship SET marineSupervisor = '尤金灼' WHERE cnShipName IN ('海豚座', '珊瑚座', '鲸鱼座', '孔雀座', '白鹭座', '天鹅座');
UPDATE ship SET marineSupervisor = '郭爱观' WHERE cnShipName IN ('千池', '秋池', '伟池', '业池', '贵池', '远晶河');
UPDATE ship SET marineSupervisor = '侯春杨' WHERE cnShipName IN ('连柏湖', '山鹰座', '华池', '秀池', '河池', '远玉河');
UPDATE ship SET marineSupervisor = '王家勇' WHERE cnShipName IN ('桦林湾', '桐林湾', '连松湖', '连杨湖', '麒麟座', '华川');

-- 机务主管映射
UPDATE ship SET engineerSupervisor = '王文优' WHERE cnShipName IN ('桦林湾', '桐林湾', '楠林湾', '榕林湾', '远兰湾', '白鹭座');
UPDATE ship SET engineerSupervisor = '易伟辉' WHERE cnShipName IN ('梅林湾', '远莲湾', '远菊湾', '鲸鱼座', '连桂湖');
UPDATE ship SET engineerSupervisor = '卢云集' WHERE cnShipName IN ('连欢湖', '连囍湖', '连乐湖', '海豚座', '天鹅座', '远玉河');
UPDATE ship SET engineerSupervisor = '陈小平' WHERE cnShipName IN ('珊瑚座', '伟池', '业池', '华池', '贵池', '华川');
UPDATE ship SET engineerSupervisor = '涂建红' WHERE cnShipName IN ('千池', '秋池', '秀池', '河池', '连杨湖', '连杉湖');
UPDATE ship SET engineerSupervisor = '李丹' WHERE cnShipName IN ('麒麟座', '孔雀座', '连柏湖', '远晶河');
UPDATE ship SET engineerSupervisor = '曹伟' WHERE cnShipName IN ('山鹰座', '连松湖');

-- 电气主管映射
UPDATE ship SET electricSupervisor = '汪建军' WHERE cnShipName IN (
  '梅林湾', '桦林湾', '楠林湾', '榕林湾', '千池', '秋池', '伟池', '业池', '华池', '贵池', 
  '秀池', '河池', '华川', '桐林湾', '远莲湾', '远兰湾', '远菊湾'
);
UPDATE ship SET electricSupervisor = '沈万东' WHERE cnShipName IN (
  '连松湖', '连欢湖', '连湖', '连乐湖', '麒麟座', '海豚座', '珊瑚座', '鲸鱼座', 
  '山鹰座', '孔雀座', '白鹭座', '天鹅座', '远晶河', '远玉河', '连柏湖', '连杨湖', '连杉湖', '连桂湖'
);

-- 总管
UPDATE ship SET crewSupervisor = '邓红光' WHERE teamCode = 'team2';
