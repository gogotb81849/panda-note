"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiaryService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
/**
 * Extract client IP address from request
 */
function getClientIp(req) {
    var _a, _b;
    return req.headers['x-forwarded-for'] ||
        req.headers['x-real-ip'] ||
        ((_a = req.connection) === null || _a === void 0 ? void 0 : _a.remoteAddress) ||
        ((_b = req.socket) === null || _b === void 0 ? void 0 : _b.remoteAddress) ||
        'unknown';
}
/**
 * 安全地将字符串转换为 Date，避免 Invalid Date 写入 Prisma
 * 返回值：Date | null — 传入 undefined/null/空串/无效值均返回 null
 */
function safeDate(value) {
    if (value === undefined || value === null)
        return null;
    if (typeof value !== 'string')
        return null;
    var trimmed = value.trim();
    if (!trimmed)
        return null;
    try {
        var d = new Date(trimmed);
        if (isNaN(d.getTime()))
            return null;
        return d;
    }
    catch (_a) {
        return null;
    }
}
var DiaryService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var DiaryService = _classThis = /** @class */ (function () {
        function DiaryService_1(prisma, operationLogService, staffAssignmentService) {
            this.prisma = prisma;
            this.operationLogService = operationLogService;
            this.staffAssignmentService = staffAssignmentService;
            this.logger = new common_1.Logger(DiaryService.name);
        }
        /**
         * 从文本内容中识别船名
         * @param content 文本内容
         * @param teamCode 团队编码
         * @returns 识别到的船舶列表
         */
        DiaryService_1.prototype.detectShipNames = function (content, teamCode) {
            return __awaiter(this, void 0, void 0, function () {
                var ships, detected, detectedIds, _i, ships_1, ship, matched, matchName, enNameLower, contentLower;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!content)
                                return [2 /*return*/, []];
                            return [4 /*yield*/, this.prisma.ship.findMany({
                                    where: { teamCode: teamCode },
                                    select: {
                                        id: true,
                                        cnShipName: true,
                                        enShipName: true,
                                    },
                                })];
                        case 1:
                            ships = _a.sent();
                            detected = [];
                            detectedIds = new Set();
                            for (_i = 0, ships_1 = ships; _i < ships_1.length; _i++) {
                                ship = ships_1[_i];
                                if (detectedIds.has(ship.id))
                                    continue;
                                matched = false;
                                matchName = ship.cnShipName;
                                if (ship.cnShipName && content.includes(ship.cnShipName)) {
                                    matched = true;
                                    matchName = ship.cnShipName;
                                }
                                if (!matched && ship.enShipName) {
                                    enNameLower = ship.enShipName.toLowerCase();
                                    contentLower = content.toLowerCase();
                                    if (contentLower.includes(enNameLower)) {
                                        matched = true;
                                        matchName = ship.enShipName;
                                    }
                                }
                                if (matched) {
                                    detected.push({
                                        shipId: ship.id,
                                        shipName: ship.cnShipName,
                                        matchName: matchName,
                                    });
                                    detectedIds.add(ship.id);
                                }
                            }
                            return [2 /*return*/, detected];
                    }
                });
            });
        };
        /**
         * 同步日记到船舶笔记（ShipNote）
         * 注意：只同步岸基主管日记，船舶政委日记不同步到船笔记
         */
        DiaryService_1.prototype.syncDiaryToShipNotes = function (diaryId, diaryContent, userId, teamCode) {
            return __awaiter(this, void 0, void 0, function () {
                var user, roles, isShoreSupervisor, detectedShips, _i, detectedShips_1, ship, existing, noteContent;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { id: userId },
                                select: { roles: true },
                            })];
                        case 1:
                            user = _a.sent();
                            if (user) {
                                roles = Array.isArray(user.roles) ? user.roles : [user.roles];
                                isShoreSupervisor = roles.some(function (r) {
                                    return r === client_1.UserRole.admin ||
                                        r === client_1.UserRole.shore_marine_supervisor ||
                                        r === client_1.UserRole.shore_engineer_supervisor ||
                                        r === client_1.UserRole.shore_electric_supervisor ||
                                        r === client_1.UserRole.shore_crew_supervisor ||
                                        r === client_1.UserRole.general_manager ||
                                        r === client_1.UserRole.company_admin;
                                });
                                // 船舶政委日记不同步
                                if (!isShoreSupervisor) {
                                    this.logger.log("\u65E5\u8BB0 ".concat(diaryId, " \u4F5C\u8005\u975E\u5CB8\u57FA\u4E3B\u7BA1\uFF0C\u4E0D\u540C\u6B65\u5230\u8239\u7B14\u8BB0"));
                                    return [2 /*return*/];
                                }
                            }
                            return [4 /*yield*/, this.detectShipNames(diaryContent, teamCode)];
                        case 2:
                            detectedShips = _a.sent();
                            if (detectedShips.length === 0)
                                return [2 /*return*/];
                            _i = 0, detectedShips_1 = detectedShips;
                            _a.label = 3;
                        case 3:
                            if (!(_i < detectedShips_1.length)) return [3 /*break*/, 7];
                            ship = detectedShips_1[_i];
                            return [4 /*yield*/, this.prisma.shipNote.findFirst({
                                    where: {
                                        teamCode: teamCode,
                                        shipId: ship.shipId,
                                        source: 'diary',
                                        content: {
                                            contains: "diary_id:".concat(diaryId),
                                        },
                                    },
                                })];
                        case 4:
                            existing = _a.sent();
                            if (!!existing) return [3 /*break*/, 6];
                            noteContent = "\u3010\u4E3B\u7BA1\u65E5\u8BB0\u5173\u8054\u3011diary_id:".concat(diaryId, "\n").concat(diaryContent);
                            return [4 /*yield*/, this.prisma.shipNote.create({
                                    data: {
                                        teamCode: teamCode,
                                        shipId: ship.shipId,
                                        userId: userId,
                                        content: noteContent,
                                        source: 'diary',
                                        tags: ['主管日记'],
                                    },
                                })];
                        case 5:
                            _a.sent();
                            _a.label = 6;
                        case 6:
                            _i++;
                            return [3 /*break*/, 3];
                        case 7: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * 同步政委日记动态字段到 Ship 表（谁最新以谁为准）
         * 仅船舶政委（ship_political_instructor）的日记触发此同步
         * 船工主管通过粘贴船舶报告直接更新 Ship，此处为政委通道
         */
        DiaryService_1.prototype.syncDiaryToShipDynamic = function (diary, userId, teamCode) {
            return __awaiter(this, void 0, void 0, function () {
                var user, roles, isPoliticalInstructor, shipId, data, ds, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!diary || !diary.shipId)
                                return [2 /*return*/];
                            return [4 /*yield*/, this.prisma.user.findUnique({
                                    where: { id: userId },
                                    select: { roles: true },
                                })];
                        case 1:
                            user = _a.sent();
                            if (user) {
                                roles = Array.isArray(user.roles) ? user.roles : [user.roles];
                                isPoliticalInstructor = roles.includes(client_1.UserRole.ship_political_instructor);
                                if (!isPoliticalInstructor) {
                                    return [2 /*return*/];
                                }
                            }
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            shipId = diary.shipId;
                            data = {
                                dynamicSource: 'political',
                                dynamicUpdatedAt: new Date(),
                            };
                            // 字段映射：Diary → Ship
                            if (diary.voyageNumber)
                                data.currentVoyage = diary.voyageNumber;
                            if (diary.shipPosition)
                                data.currentLocation = diary.shipPosition;
                            if (diary.departurePort)
                                data.departurePort = diary.departurePort;
                            if (diary.arrivalPort)
                                data.etaPort = diary.arrivalPort;
                            if (diary.timezone)
                                data.timezone = diary.timezone;
                            // dynamicStatus 映射到 currentStatus
                            if (diary.dynamicStatus) {
                                ds = String(diary.dynamicStatus);
                                if (/航行|在航/.test(ds))
                                    data.currentStatus = 'voyage';
                                else if (/锚泊|抛锚/.test(ds))
                                    data.currentStatus = 'anchored';
                                else if (/靠泊|抵港|在港/.test(ds))
                                    data.currentStatus = 'berthed';
                            }
                            // 天气/海况映射（Diary 的 weather/seaCondition 是描述性，写入对应字段）
                            if (diary.weather)
                                data.temperature = diary.weather;
                            if (diary.seaCondition)
                                data.waveLevel = diary.seaCondition;
                            return [4 /*yield*/, this.prisma.ship.update({ where: { id: shipId }, data: data })];
                        case 3:
                            _a.sent();
                            this.logger.log("\u653F\u59D4\u65E5\u8BB0 ".concat(diary.id, " \u5DF2\u540C\u6B65\u8239\u8236\u52A8\u6001\u5230 Ship ").concat(shipId));
                            return [3 /*break*/, 5];
                        case 4:
                            error_1 = _a.sent();
                            this.logger.error("\u540C\u6B65\u653F\u59D4\u65E5\u8BB0\u5230\u8239\u8236\u52A8\u6001\u5931\u8D25 diaryId=".concat(diary.id), error_1);
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        DiaryService_1.prototype.validateScheduleOwnership = function (scheduleIds, userId, teamCode) {
            return __awaiter(this, void 0, void 0, function () {
                var uniqueIds, schedules, foundIds_1, missing;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!scheduleIds || scheduleIds.length === 0)
                                return [2 /*return*/, []];
                            uniqueIds = Array.from(new Set(scheduleIds));
                            return [4 /*yield*/, this.prisma.schedule.findMany({
                                    where: {
                                        id: { in: uniqueIds },
                                        teamCode: teamCode,
                                        createdById: userId,
                                        finishStatus: 'completed',
                                    },
                                    include: {
                                        ship: { select: { cnShipName: true } },
                                        createdBy: { select: { realName: true } },
                                    },
                                })];
                        case 1:
                            schedules = _a.sent();
                            if (schedules.length !== uniqueIds.length) {
                                foundIds_1 = new Set(schedules.map(function (s) { return s.id; }));
                                missing = uniqueIds.filter(function (id) { return !foundIds_1.has(id); });
                                throw new common_1.BadRequestException("\u90E8\u5206\u65E5\u7A0B\u4E0D\u5B58\u5728\u3001\u4E0D\u5C5E\u4E8E\u5F53\u524D\u7528\u6237\u6216\u5C1A\u672A\u5B8C\u6210: ".concat(missing.join(', ')));
                            }
                            return [2 /*return*/, schedules];
                    }
                });
            });
        };
        DiaryService_1.prototype.syncRelations = function (diaryId, teamCode, scheduleIds) {
            return __awaiter(this, void 0, void 0, function () {
                var uniqueIds, existing, existingIds, toAdd, toRemove;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            uniqueIds = Array.from(new Set(scheduleIds));
                            return [4 /*yield*/, this.prisma.diaryScheduleRelation.findMany({
                                    where: { diaryId: diaryId, teamCode: teamCode },
                                    select: { scheduleId: true },
                                })];
                        case 1:
                            existing = _a.sent();
                            existingIds = new Set(existing.map(function (r) { return r.scheduleId; }));
                            toAdd = uniqueIds.filter(function (id) { return !existingIds.has(id); });
                            toRemove = __spreadArray([], existingIds, true).filter(function (id) { return !uniqueIds.includes(id); });
                            if (!(toAdd.length > 0)) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.diaryScheduleRelation.createMany({
                                    data: toAdd.map(function (scheduleId) { return ({
                                        diaryId: diaryId,
                                        scheduleId: scheduleId,
                                        teamCode: teamCode,
                                    }); }),
                                    skipDuplicates: true,
                                })];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            if (!(toRemove.length > 0)) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.prisma.diaryScheduleRelation.deleteMany({
                                    where: {
                                        diaryId: diaryId,
                                        teamCode: teamCode,
                                        scheduleId: { in: toRemove },
                                    },
                                })];
                        case 4:
                            _a.sent();
                            _a.label = 5;
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        DiaryService_1.prototype.updateDiaryCategoryFromSchedules = function (diaryId, teamCode, forceFromSchedule) {
            return __awaiter(this, void 0, void 0, function () {
                var firstRelation;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.diaryScheduleRelation.findFirst({
                                where: { diaryId: diaryId, teamCode: teamCode },
                                orderBy: { id: 'asc' },
                                include: { schedule: { select: { firstType: true, secondType: true } } },
                            })];
                        case 1:
                            firstRelation = _a.sent();
                            if (!(firstRelation === null || firstRelation === void 0 ? void 0 : firstRelation.schedule)) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.diary.update({
                                    where: { id: diaryId },
                                    data: {
                                        categoryFirst: firstRelation.schedule.firstType,
                                        categorySecond: firstRelation.schedule.secondType,
                                        categorySource: 'auto',
                                    },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                        case 3:
                            if (!forceFromSchedule) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.prisma.diary.update({
                                    where: { id: diaryId },
                                    data: {
                                        categoryFirst: null,
                                        categorySecond: null,
                                        categorySource: 'manual',
                                    },
                                })];
                        case 4:
                            _a.sent();
                            _a.label = 5;
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        DiaryService_1.prototype.create = function (createDiaryDto, userId, teamCode, ipAddress, userAgent) {
            return __awaiter(this, void 0, void 0, function () {
                var date, relatedSchedules, _a, hasRelationOverride, autoCategoryFirst, autoCategorySecond, autoSource, existing, diary, detectedShips, primaryShip, error_2;
                var _b, _c, _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            date = new Date(createDiaryDto.date);
                            date.setHours(0, 0, 0, 0);
                            if (!(createDiaryDto.relatedScheduleIds && createDiaryDto.relatedScheduleIds.length > 0)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.validateScheduleOwnership(createDiaryDto.relatedScheduleIds, userId, teamCode)];
                        case 1:
                            _a = _g.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = [];
                            _g.label = 3;
                        case 3:
                            relatedSchedules = _a;
                            hasRelationOverride = relatedSchedules.length > 0
                                && !createDiaryDto.categoryFirst
                                && !createDiaryDto.categorySecond;
                            autoCategoryFirst = hasRelationOverride ? relatedSchedules[0].firstType : undefined;
                            autoCategorySecond = hasRelationOverride ? relatedSchedules[0].secondType : undefined;
                            autoSource = hasRelationOverride ? 'auto' : undefined;
                            return [4 /*yield*/, this.prisma.diary.findUnique({
                                    where: {
                                        teamCode_userId_date: {
                                            teamCode: teamCode,
                                            userId: userId,
                                            date: date,
                                        },
                                    },
                                })];
                        case 4:
                            existing = _g.sent();
                            if (!existing) return [3 /*break*/, 7];
                            return [4 /*yield*/, this.prisma.diary.update({
                                    where: { id: existing.id },
                                    data: {
                                        content: createDiaryDto.content,
                                        shipId: createDiaryDto.shipId,
                                        weather: createDiaryDto.weather,
                                        seaCondition: createDiaryDto.seaCondition,
                                        dynamicStatus: createDiaryDto.dynamicStatus,
                                        departurePort: createDiaryDto.departurePort,
                                        arrivalPort: createDiaryDto.arrivalPort,
                                        departureDate: safeDate(createDiaryDto.departureDate),
                                        arrivalDate: safeDate(createDiaryDto.arrivalDate),
                                        departureTime: safeDate(createDiaryDto.departureTime),
                                        pirateStatus: createDiaryDto.pirateStatus,
                                        pirateTime: createDiaryDto.pirateTime,
                                        shipName: createDiaryDto.shipName,
                                        timezone: createDiaryDto.timezone,
                                        shipPosition: createDiaryDto.shipPosition,
                                        isFreePortZone: createDiaryDto.isFreePortZone,
                                        isWarZone: createDiaryDto.isWarZone,
                                        leadSealOperation: createDiaryDto.leadSealOperation,
                                        categoryFirst: hasRelationOverride ? autoCategoryFirst : createDiaryDto.categoryFirst,
                                        categorySecond: hasRelationOverride ? autoCategorySecond : createDiaryDto.categorySecond,
                                        categorySource: autoSource !== null && autoSource !== void 0 ? autoSource : (createDiaryDto.categoryFirst ? 'manual' : undefined),
                                        politicalInstructorName: createDiaryDto.politicalInstructorName,
                                        politicalInstructorOnBoardDate: safeDate(createDiaryDto.politicalInstructorOnBoardDate),
                                    },
                                })];
                        case 5:
                            diary = _g.sent();
                            return [4 /*yield*/, this.operationLogService.create({
                                    userId: userId,
                                    teamCode: teamCode,
                                    operationType: '修改',
                                    operationContent: "\u66F4\u65B0\u65E5\u8BB0\uFF08ID:".concat(diary.id, "\uFF09"),
                                    ipAddress: ipAddress,
                                    userAgent: userAgent,
                                })];
                        case 6:
                            _g.sent();
                            return [3 /*break*/, 10];
                        case 7: return [4 /*yield*/, this.prisma.diary.create({
                                data: {
                                    userId: userId,
                                    teamCode: teamCode,
                                    date: date,
                                    content: createDiaryDto.content,
                                    shipId: createDiaryDto.shipId,
                                    weather: createDiaryDto.weather,
                                    seaCondition: createDiaryDto.seaCondition,
                                    dynamicStatus: createDiaryDto.dynamicStatus,
                                    departurePort: createDiaryDto.departurePort,
                                    arrivalPort: createDiaryDto.arrivalPort,
                                    departureDate: safeDate(createDiaryDto.departureDate),
                                    arrivalDate: safeDate(createDiaryDto.arrivalDate),
                                    departureTime: safeDate(createDiaryDto.departureTime),
                                    pirateStatus: createDiaryDto.pirateStatus,
                                    pirateTime: createDiaryDto.pirateTime,
                                    shipName: createDiaryDto.shipName,
                                    timezone: createDiaryDto.timezone,
                                    shipPosition: createDiaryDto.shipPosition,
                                    isFreePortZone: (_b = createDiaryDto.isFreePortZone) !== null && _b !== void 0 ? _b : false,
                                    isWarZone: (_c = createDiaryDto.isWarZone) !== null && _c !== void 0 ? _c : false,
                                    leadSealOperation: (_d = createDiaryDto.leadSealOperation) !== null && _d !== void 0 ? _d : false,
                                    categoryFirst: hasRelationOverride ? autoCategoryFirst : ((_e = createDiaryDto.categoryFirst) !== null && _e !== void 0 ? _e : null),
                                    categorySecond: hasRelationOverride ? autoCategorySecond : ((_f = createDiaryDto.categorySecond) !== null && _f !== void 0 ? _f : null),
                                    categorySource: autoSource !== null && autoSource !== void 0 ? autoSource : (createDiaryDto.categoryFirst ? 'manual' : 'manual'),
                                    politicalInstructorName: createDiaryDto.politicalInstructorName,
                                    politicalInstructorOnBoardDate: safeDate(createDiaryDto.politicalInstructorOnBoardDate),
                                },
                            })];
                        case 8:
                            diary = _g.sent();
                            return [4 /*yield*/, this.operationLogService.create({
                                    userId: userId,
                                    teamCode: teamCode,
                                    operationType: '新增',
                                    operationContent: "\u521B\u5EFA\u65E5\u8BB0\uFF08ID:".concat(diary.id, "\uFF09"),
                                    ipAddress: ipAddress,
                                    userAgent: userAgent,
                                })];
                        case 9:
                            _g.sent();
                            _g.label = 10;
                        case 10:
                            if (!(createDiaryDto.relatedScheduleIds && createDiaryDto.relatedScheduleIds.length > 0)) return [3 /*break*/, 12];
                            return [4 /*yield*/, this.syncRelations(diary.id, teamCode, createDiaryDto.relatedScheduleIds)];
                        case 11:
                            _g.sent();
                            _g.label = 12;
                        case 12:
                            _g.trys.push([12, 18, , 19]);
                            return [4 /*yield*/, this.detectShipNames(createDiaryDto.content, teamCode)];
                        case 13:
                            detectedShips = _g.sent();
                            if (!(detectedShips.length > 0)) return [3 /*break*/, 17];
                            primaryShip = detectedShips[0];
                            if (!!diary.shipId) return [3 /*break*/, 15];
                            return [4 /*yield*/, this.prisma.diary.update({
                                    where: { id: diary.id },
                                    data: {
                                        shipId: primaryShip.shipId,
                                        shipName: primaryShip.shipName,
                                    },
                                })];
                        case 14:
                            diary = _g.sent();
                            _g.label = 15;
                        case 15: return [4 /*yield*/, this.syncDiaryToShipNotes(diary.id, createDiaryDto.content, userId, teamCode)];
                        case 16:
                            _g.sent();
                            _g.label = 17;
                        case 17: return [3 /*break*/, 19];
                        case 18:
                            error_2 = _g.sent();
                            this.logger.error('自动识别船名失败', error_2);
                            return [3 /*break*/, 19];
                        case 19: 
                        // 同步政委日记动态字段到 Ship 表（谁最新以谁为准）
                        return [4 /*yield*/, this.syncDiaryToShipDynamic(diary, userId, teamCode)];
                        case 20:
                            // 同步政委日记动态字段到 Ship 表（谁最新以谁为准）
                            _g.sent();
                            return [2 /*return*/, diary];
                    }
                });
            });
        };
        DiaryService_1.prototype.findById = function (id, userId, teamCode) {
            return __awaiter(this, void 0, void 0, function () {
                var diary;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.diary.findFirst({
                                where: { id: id, userId: userId, teamCode: teamCode },
                            })];
                        case 1:
                            diary = _a.sent();
                            if (!diary) {
                                throw new common_1.NotFoundException('日记不存在');
                            }
                            return [2 /*return*/, diary];
                    }
                });
            });
        };
        DiaryService_1.prototype.findByDate = function (userId, teamCode, date) {
            return __awaiter(this, void 0, void 0, function () {
                var targetDate, diary;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            targetDate = new Date(date);
                            targetDate.setHours(0, 0, 0, 0);
                            return [4 /*yield*/, this.prisma.diary.findUnique({
                                    where: {
                                        teamCode_userId_date: {
                                            teamCode: teamCode,
                                            userId: userId,
                                            date: targetDate,
                                        },
                                    },
                                })];
                        case 1:
                            diary = _a.sent();
                            if (!diary) {
                                return [2 /*return*/, null];
                            }
                            return [2 /*return*/, diary];
                    }
                });
            });
        };
        DiaryService_1.prototype.findAll = function (userId, teamCode, startDate, endDate) {
            return __awaiter(this, void 0, void 0, function () {
                var where;
                return __generator(this, function (_a) {
                    where = { userId: userId, teamCode: teamCode };
                    if (startDate && endDate) {
                        where.date = {
                            gte: new Date(startDate),
                            lte: new Date(endDate),
                        };
                    }
                    return [2 /*return*/, this.prisma.diary.findMany({
                            where: where,
                            orderBy: { date: 'desc' },
                        })];
                });
            });
        };
        /**
         * 根据用户权限获取日记列表（支持跨团队流动场景）
         * 规则：
         * - 在船：当前船舶所有日记 + 自己在所有船舶上的日记
         * - 休假：只有自己在所有船舶上的日记
         * - 历史船舶：只能看到自己任上的日记
         */
        DiaryService_1.prototype.getDiariesByPermission = function (userId, teamCode, startDate, endDate) {
            return __awaiter(this, void 0, void 0, function () {
                var currentAssignment, historyAssignments, isOnLeave, where_1, whereConditions, _i, historyAssignments_1, assignment, where;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.staffAssignmentService.getCurrentAssignment(userId)];
                        case 1:
                            currentAssignment = _a.sent();
                            return [4 /*yield*/, this.staffAssignmentService.getHistoryAssignments(userId, teamCode)];
                        case 2:
                            historyAssignments = _a.sent();
                            return [4 /*yield*/, this.staffAssignmentService.isUserOnLeave(userId)];
                        case 3:
                            isOnLeave = _a.sent();
                            if (isOnLeave) {
                                where_1 = { userId: userId };
                                if (startDate && endDate) {
                                    where_1.date = { gte: new Date(startDate), lte: new Date(endDate) };
                                }
                                return [2 /*return*/, this.prisma.diary.findMany({ where: where_1, orderBy: { date: 'desc' } })];
                            }
                            whereConditions = [];
                            if (currentAssignment === null || currentAssignment === void 0 ? void 0 : currentAssignment.shipId) {
                                whereConditions.push({ shipId: currentAssignment.shipId });
                            }
                            whereConditions.push({ userId: userId });
                            for (_i = 0, historyAssignments_1 = historyAssignments; _i < historyAssignments_1.length; _i++) {
                                assignment = historyAssignments_1[_i];
                                if (assignment.shipId !== (currentAssignment === null || currentAssignment === void 0 ? void 0 : currentAssignment.shipId)) {
                                    whereConditions.push({ shipId: assignment.shipId, userId: userId });
                                }
                            }
                            where = {
                                teamCode: teamCode,
                                OR: whereConditions,
                            };
                            if (startDate && endDate) {
                                where.date = { gte: new Date(startDate), lte: new Date(endDate) };
                            }
                            return [2 /*return*/, this.prisma.diary.findMany({ where: where, orderBy: { date: 'desc' } })];
                    }
                });
            });
        };
        /**
         * 船舶视角查询日记
         * - 在船期间：该船舶所有历史日记（历任政委）
         * - 下船后：该船舶中自己任职期间的日记
         */
        DiaryService_1.prototype.getDiariesByShipView = function (userId, teamCode, shipId) {
            return __awaiter(this, void 0, void 0, function () {
                var currentAssignment, isOnBoard, where, userAssignments, dateConditions, _i, userAssignments_1, assignment;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.staffAssignmentService.getCurrentAssignment(userId)];
                        case 1:
                            currentAssignment = _a.sent();
                            return [4 /*yield*/, this.staffAssignmentService.isUserOnBoard(userId)];
                        case 2:
                            isOnBoard = _a.sent();
                            where = { shipId: shipId };
                            if (!(isOnBoard && (currentAssignment === null || currentAssignment === void 0 ? void 0 : currentAssignment.shipId) === shipId)) return [3 /*break*/, 3];
                            where.teamCode = teamCode;
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, this.prisma.staffAssignment.findMany({
                                where: { userId: userId, shipId: shipId },
                                orderBy: { startDate: 'desc' },
                            })];
                        case 4:
                            userAssignments = _a.sent();
                            if (userAssignments.length === 0) {
                                return [2 /*return*/, []];
                            }
                            dateConditions = [];
                            for (_i = 0, userAssignments_1 = userAssignments; _i < userAssignments_1.length; _i++) {
                                assignment = userAssignments_1[_i];
                                dateConditions.push({
                                    date: __assign({ gte: assignment.startDate }, (assignment.endDate ? { lte: assignment.endDate } : {})),
                                });
                            }
                            where.userId = userId;
                            where.teamCode = teamCode;
                            where.OR = dateConditions;
                            _a.label = 5;
                        case 5: return [2 /*return*/, this.prisma.diary.findMany({
                                where: where,
                                orderBy: { date: 'desc' },
                                include: {
                                    _count: { select: { relatedSchedules: true } },
                                },
                            })];
                    }
                });
            });
        };
        /**
         * 个人视角查询日记（跨船汇总）
         * - 始终只能看到自己任职期间的日记
         */
        DiaryService_1.prototype.getDiariesByPersonalView = function (userId, teamCode, startDate, endDate) {
            return __awaiter(this, void 0, void 0, function () {
                var userAssignments, dateConditions, _i, userAssignments_2, assignment, where;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.staffAssignment.findMany({
                                where: { userId: userId },
                                orderBy: { startDate: 'desc' },
                            })];
                        case 1:
                            userAssignments = _a.sent();
                            if (userAssignments.length === 0) {
                                return [2 /*return*/, []];
                            }
                            dateConditions = [];
                            for (_i = 0, userAssignments_2 = userAssignments; _i < userAssignments_2.length; _i++) {
                                assignment = userAssignments_2[_i];
                                dateConditions.push({
                                    shipId: assignment.shipId,
                                    date: __assign({ gte: assignment.startDate }, (assignment.endDate ? { lte: assignment.endDate } : {})),
                                });
                            }
                            where = {
                                userId: userId,
                                teamCode: teamCode,
                                OR: dateConditions,
                            };
                            if (startDate && endDate) {
                                where.date = {
                                    gte: new Date(startDate),
                                    lte: new Date(endDate),
                                };
                            }
                            return [2 /*return*/, this.prisma.diary.findMany({
                                    where: where,
                                    orderBy: { date: 'desc' },
                                    include: {
                                        _count: { select: { relatedSchedules: true } },
                                    },
                                })];
                    }
                });
            });
        };
        /**
         * 获取用户权限信息（用于前端显示）
         */
        DiaryService_1.prototype.getUserDiaryPermission = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.staffAssignmentService.getUserDiaryPermission(userId)];
                });
            });
        };
        DiaryService_1.prototype.update = function (id, updateDiaryDto, userId, teamCode, ipAddress, userAgent) {
            return __awaiter(this, void 0, void 0, function () {
                var diary, hasRelations, hasCategoryOverride, autoCategoryFirst, autoCategorySecond, autoSource, firstSchedule, updated, detectedShips, primaryShip, error_3;
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, this.prisma.diary.findFirst({
                                where: { id: id, userId: userId, teamCode: teamCode },
                            })];
                        case 1:
                            diary = _e.sent();
                            if (!diary) {
                                throw new common_1.NotFoundException('日记不存在');
                            }
                            hasRelations = false;
                            if (!(updateDiaryDto.relatedScheduleIds && updateDiaryDto.relatedScheduleIds.length > 0)) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.validateScheduleOwnership(updateDiaryDto.relatedScheduleIds, userId, teamCode)];
                        case 2:
                            _e.sent();
                            hasRelations = true;
                            return [3 /*break*/, 4];
                        case 3:
                            if (updateDiaryDto.relatedScheduleIds && updateDiaryDto.relatedScheduleIds.length === 0) {
                                hasRelations = true; // 允许清空
                            }
                            _e.label = 4;
                        case 4:
                            hasCategoryOverride = hasRelations
                                && ((_b = (_a = updateDiaryDto.relatedScheduleIds) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) > 0
                                && !updateDiaryDto.categoryFirst
                                && !updateDiaryDto.categorySecond;
                            if (!hasCategoryOverride) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.prisma.schedule.findFirst({
                                    where: {
                                        id: { in: updateDiaryDto.relatedScheduleIds },
                                        teamCode: teamCode,
                                        createdById: userId,
                                        finishStatus: 'completed',
                                    },
                                    orderBy: { id: 'asc' },
                                })];
                        case 5:
                            firstSchedule = _e.sent();
                            if (firstSchedule) {
                                autoCategoryFirst = firstSchedule.firstType;
                                autoCategorySecond = firstSchedule.secondType;
                                autoSource = 'auto';
                            }
                            _e.label = 6;
                        case 6: return [4 /*yield*/, this.prisma.diary.update({
                                where: { id: id },
                                data: {
                                    content: updateDiaryDto.content,
                                    shipId: updateDiaryDto.shipId,
                                    weather: updateDiaryDto.weather,
                                    seaCondition: updateDiaryDto.seaCondition,
                                    dynamicStatus: updateDiaryDto.dynamicStatus,
                                    departurePort: updateDiaryDto.departurePort,
                                    arrivalPort: updateDiaryDto.arrivalPort,
                                    departureDate: safeDate(updateDiaryDto.departureDate),
                                    arrivalDate: safeDate(updateDiaryDto.arrivalDate),
                                    departureTime: safeDate(updateDiaryDto.departureTime),
                                    pirateStatus: updateDiaryDto.pirateStatus,
                                    pirateTime: updateDiaryDto.pirateTime,
                                    shipName: updateDiaryDto.shipName,
                                    timezone: updateDiaryDto.timezone,
                                    shipPosition: updateDiaryDto.shipPosition,
                                    isFreePortZone: updateDiaryDto.isFreePortZone,
                                    isWarZone: updateDiaryDto.isWarZone,
                                    leadSealOperation: updateDiaryDto.leadSealOperation,
                                    categoryFirst: hasCategoryOverride ? autoCategoryFirst : updateDiaryDto.categoryFirst,
                                    categorySecond: hasCategoryOverride ? autoCategorySecond : updateDiaryDto.categorySecond,
                                    categorySource: hasCategoryOverride
                                        ? 'auto'
                                        : (updateDiaryDto.categoryFirst !== undefined ? 'manual' : undefined),
                                    politicalInstructorName: updateDiaryDto.politicalInstructorName,
                                    politicalInstructorOnBoardDate: safeDate(updateDiaryDto.politicalInstructorOnBoardDate),
                                },
                            })];
                        case 7:
                            updated = _e.sent();
                            if (!hasRelations) return [3 /*break*/, 10];
                            return [4 /*yield*/, this.syncRelations(id, teamCode, updateDiaryDto.relatedScheduleIds)];
                        case 8:
                            _e.sent();
                            if (!(((_d = (_c = updateDiaryDto.relatedScheduleIds) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0) === 0)) return [3 /*break*/, 10];
                            return [4 /*yield*/, this.prisma.diary.update({
                                    where: { id: id },
                                    data: { categorySource: 'manual' },
                                })];
                        case 9:
                            _e.sent();
                            _e.label = 10;
                        case 10: return [4 /*yield*/, this.operationLogService.create({
                                userId: userId,
                                teamCode: teamCode,
                                operationType: '修改',
                                operationContent: "\u66F4\u65B0\u65E5\u8BB0\uFF08ID:".concat(id, "\uFF09"),
                                ipAddress: ipAddress,
                                userAgent: userAgent,
                            })];
                        case 11:
                            _e.sent();
                            if (!(updateDiaryDto.content !== undefined)) return [3 /*break*/, 19];
                            _e.label = 12;
                        case 12:
                            _e.trys.push([12, 18, , 19]);
                            return [4 /*yield*/, this.detectShipNames(updateDiaryDto.content, teamCode)];
                        case 13:
                            detectedShips = _e.sent();
                            if (!(detectedShips.length > 0)) return [3 /*break*/, 17];
                            primaryShip = detectedShips[0];
                            if (!!updated.shipId) return [3 /*break*/, 15];
                            return [4 /*yield*/, this.prisma.diary.update({
                                    where: { id: id },
                                    data: {
                                        shipId: primaryShip.shipId,
                                        shipName: primaryShip.shipName,
                                    },
                                })];
                        case 14:
                            updated = _e.sent();
                            _e.label = 15;
                        case 15: return [4 /*yield*/, this.syncDiaryToShipNotes(id, updateDiaryDto.content, userId, teamCode)];
                        case 16:
                            _e.sent();
                            _e.label = 17;
                        case 17: return [3 /*break*/, 19];
                        case 18:
                            error_3 = _e.sent();
                            this.logger.error('自动识别船名失败', error_3);
                            return [3 /*break*/, 19];
                        case 19: 
                        // 同步政委日记动态字段到 Ship 表（谁最新以谁为准）
                        return [4 /*yield*/, this.syncDiaryToShipDynamic(updated, userId, teamCode)];
                        case 20:
                            // 同步政委日记动态字段到 Ship 表（谁最新以谁为准）
                            _e.sent();
                            return [2 /*return*/, updated];
                    }
                });
            });
        };
        DiaryService_1.prototype.remove = function (id, userId, teamCode, ipAddress, userAgent) {
            return __awaiter(this, void 0, void 0, function () {
                var diary;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.diary.findFirst({
                                where: { id: id, userId: userId, teamCode: teamCode },
                            })];
                        case 1:
                            diary = _a.sent();
                            if (!diary) {
                                throw new common_1.NotFoundException('日记不存在');
                            }
                            return [4 /*yield*/, this.prisma.diary.delete({
                                    where: { id: id },
                                })];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.operationLogService.create({
                                    userId: userId,
                                    teamCode: teamCode,
                                    operationType: '删除',
                                    operationContent: "\u5220\u9664\u65E5\u8BB0\uFF08ID:".concat(id, "\uFF09"),
                                    ipAddress: ipAddress,
                                    userAgent: userAgent,
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        // ======= 日记与日程关联相关方法 =======
        DiaryService_1.prototype.getRelatedSchedules = function (diaryId, userId, teamCode) {
            return __awaiter(this, void 0, void 0, function () {
                var diary, relations;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.diary.findFirst({
                                where: { id: diaryId, userId: userId, teamCode: teamCode },
                            })];
                        case 1:
                            diary = _a.sent();
                            if (!diary) {
                                throw new common_1.NotFoundException('日记不存在');
                            }
                            return [4 /*yield*/, this.prisma.diaryScheduleRelation.findMany({
                                    where: { diaryId: diaryId, teamCode: teamCode },
                                    orderBy: { id: 'asc' },
                                    include: {
                                        schedule: {
                                            include: {
                                                ship: { select: { cnShipName: true } },
                                                createdBy: { select: { realName: true } },
                                            },
                                        },
                                    },
                                })];
                        case 2:
                            relations = _a.sent();
                            return [2 /*return*/, relations.map(function (r) {
                                    var _a, _b, _c, _d;
                                    return ({
                                        scheduleId: r.schedule.id,
                                        firstType: r.schedule.firstType,
                                        secondType: r.schedule.secondType,
                                        title: r.schedule.title,
                                        eventDetail: r.schedule.eventDetail,
                                        shipName: (_b = (_a = r.schedule.ship) === null || _a === void 0 ? void 0 : _a.cnShipName) !== null && _b !== void 0 ? _b : null,
                                        finishStatus: r.schedule.finishStatus,
                                        recordDate: r.schedule.recordDate,
                                        createdByRealName: (_d = (_c = r.schedule.createdBy) === null || _c === void 0 ? void 0 : _c.realName) !== null && _d !== void 0 ? _d : null,
                                    });
                                })];
                    }
                });
            });
        };
        DiaryService_1.prototype.addRelatedSchedules = function (diaryId, userId, teamCode, scheduleIds) {
            return __awaiter(this, void 0, void 0, function () {
                var diary, validSchedules, uniqueIds;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.diary.findFirst({
                                where: { id: diaryId, userId: userId, teamCode: teamCode },
                            })];
                        case 1:
                            diary = _a.sent();
                            if (!diary) {
                                throw new common_1.NotFoundException('日记不存在');
                            }
                            if (!scheduleIds || scheduleIds.length === 0) {
                                throw new common_1.BadRequestException('scheduleIds 不能为空');
                            }
                            return [4 /*yield*/, this.validateScheduleOwnership(scheduleIds, userId, teamCode)];
                        case 2:
                            validSchedules = _a.sent();
                            uniqueIds = Array.from(new Set(scheduleIds));
                            return [4 /*yield*/, this.prisma.diaryScheduleRelation.createMany({
                                    data: uniqueIds.map(function (scheduleId) { return ({
                                        diaryId: diaryId,
                                        scheduleId: scheduleId,
                                        teamCode: teamCode,
                                    }); }),
                                    skipDuplicates: true,
                                })];
                        case 3:
                            _a.sent();
                            // 自动从第一条关联日程继承分类
                            return [4 /*yield*/, this.updateDiaryCategoryFromSchedules(diaryId, teamCode, false)];
                        case 4:
                            // 自动从第一条关联日程继承分类
                            _a.sent();
                            return [2 /*return*/, { success: true, addedCount: uniqueIds.length }];
                    }
                });
            });
        };
        DiaryService_1.prototype.removeRelatedSchedule = function (diaryId, scheduleId, userId, teamCode) {
            return __awaiter(this, void 0, void 0, function () {
                var diary, relation;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.diary.findFirst({
                                where: { id: diaryId, userId: userId, teamCode: teamCode },
                            })];
                        case 1:
                            diary = _a.sent();
                            if (!diary) {
                                throw new common_1.NotFoundException('日记不存在');
                            }
                            return [4 /*yield*/, this.prisma.diaryScheduleRelation.findFirst({
                                    where: { diaryId: diaryId, scheduleId: scheduleId, teamCode: teamCode },
                                })];
                        case 2:
                            relation = _a.sent();
                            if (!relation) {
                                throw new common_1.NotFoundException('该日程未关联此日记');
                            }
                            return [4 /*yield*/, this.prisma.diaryScheduleRelation.delete({
                                    where: { id: relation.id },
                                })];
                        case 3:
                            _a.sent();
                            // 更新分类（若无剩余关联则回到 manual）
                            return [4 /*yield*/, this.updateDiaryCategoryFromSchedules(diaryId, teamCode, true)];
                        case 4:
                            // 更新分类（若无剩余关联则回到 manual）
                            _a.sent();
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        DiaryService_1.prototype.getTodaySchedulesAvailable = function (userId, teamCode, date) {
            return __awaiter(this, void 0, void 0, function () {
                var targetDate, dayStart, dayEnd, yesterdayStart, startOfRange, endOfRange, userDiaries, diaryIds, existingRelations, _a, alreadyRelatedScheduleIds, schedules;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (date) {
                                targetDate = new Date(date);
                                targetDate.setHours(0, 0, 0, 0);
                            }
                            else {
                                targetDate = new Date();
                                targetDate.setHours(0, 0, 0, 0);
                            }
                            dayStart = new Date(targetDate);
                            dayEnd = new Date(targetDate);
                            dayEnd.setDate(dayEnd.getDate() + 1);
                            yesterdayStart = new Date(targetDate);
                            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
                            startOfRange = yesterdayStart;
                            endOfRange = dayEnd;
                            return [4 /*yield*/, this.prisma.diary.findMany({
                                    where: { userId: userId, teamCode: teamCode },
                                    select: { id: true },
                                })];
                        case 1:
                            userDiaries = _b.sent();
                            diaryIds = userDiaries.map(function (d) { return d.id; });
                            if (!(diaryIds.length > 0)) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.diaryScheduleRelation.findMany({
                                    where: {
                                        teamCode: teamCode,
                                        diaryId: { in: diaryIds },
                                    },
                                    select: { scheduleId: true },
                                })];
                        case 2:
                            _a = _b.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _a = [];
                            _b.label = 4;
                        case 4:
                            existingRelations = _a;
                            alreadyRelatedScheduleIds = new Set(existingRelations.map(function (r) { return r.scheduleId; }));
                            return [4 /*yield*/, this.prisma.schedule.findMany({
                                    where: {
                                        teamCode: teamCode,
                                        createdById: userId,
                                        finishStatus: 'completed',
                                        recordDate: {
                                            gte: startOfRange,
                                            lt: endOfRange,
                                        },
                                        id: { notIn: __spreadArray([], alreadyRelatedScheduleIds, true) },
                                    },
                                    include: {
                                        ship: { select: { cnShipName: true } },
                                        createdBy: { select: { realName: true } },
                                    },
                                    orderBy: { recordDate: 'asc' },
                                })];
                        case 5:
                            schedules = _b.sent();
                            return [2 /*return*/, schedules.map(function (s) {
                                    var _a, _b, _c, _d;
                                    return ({
                                        scheduleId: s.id,
                                        firstType: s.firstType,
                                        secondType: s.secondType,
                                        title: s.title,
                                        eventDetail: s.eventDetail,
                                        shipName: (_b = (_a = s.ship) === null || _a === void 0 ? void 0 : _a.cnShipName) !== null && _b !== void 0 ? _b : null,
                                        finishStatus: s.finishStatus,
                                        recordDate: s.recordDate,
                                        createdByRealName: (_d = (_c = s.createdBy) === null || _c === void 0 ? void 0 : _c.realName) !== null && _d !== void 0 ? _d : null,
                                    });
                                })];
                    }
                });
            });
        };
        return DiaryService_1;
    }());
    __setFunctionName(_classThis, "DiaryService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DiaryService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return DiaryService = _classThis;
}();
exports.DiaryService = DiaryService;
