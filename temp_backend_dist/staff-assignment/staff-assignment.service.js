"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffAssignmentService = void 0;
var common_1 = require("@nestjs/common");
var StaffAssignmentService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var StaffAssignmentService = _classThis = /** @class */ (function () {
        function StaffAssignmentService_1(prisma, operationLogService) {
            this.prisma = prisma;
            this.operationLogService = operationLogService;
        }
        /**
         * 创建派任记录（上船）
         */
        StaffAssignmentService_1.prototype.create = function (teamCode_1, createDto_1) {
            return __awaiter(this, arguments, void 0, function (teamCode, createDto, userId) {
                var activeAssignment, ship, user;
                var _this = this;
                if (userId === void 0) { userId = 0; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.staffAssignment.findFirst({
                                where: {
                                    userId: createDto.userId,
                                    status: 'active',
                                    endDate: null,
                                },
                            })];
                        case 1:
                            activeAssignment = _a.sent();
                            if (activeAssignment) {
                                throw new common_1.BadRequestException('该政委当前已有在船记录，请先下船登记');
                            }
                            return [4 /*yield*/, this.prisma.ship.findFirst({
                                    where: { id: createDto.shipId, teamCode: teamCode },
                                })];
                        case 2:
                            ship = _a.sent();
                            if (!ship) {
                                throw new common_1.NotFoundException('船舶不存在');
                            }
                            return [4 /*yield*/, this.prisma.user.findUnique({
                                    where: { id: createDto.userId },
                                })];
                        case 3:
                            user = _a.sent();
                            if (!user) {
                                throw new common_1.NotFoundException('用户不存在');
                            }
                            return [2 /*return*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var result;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.staffAssignment.create({
                                                    data: {
                                                        userId: createDto.userId,
                                                        shipId: createDto.shipId,
                                                        teamCode: teamCode,
                                                        startDate: new Date(createDto.startDate),
                                                        endDate: createDto.endDate ? new Date(createDto.endDate) : null,
                                                        status: createDto.status || 'active',
                                                        sourceCompany: createDto.sourceCompany,
                                                        assignmentNo: createDto.assignmentNo,
                                                        remark: createDto.remark,
                                                    },
                                                    include: {
                                                        user: { select: { id: true, realName: true, username: true } },
                                                        ship: { select: { id: true, cnShipName: true } },
                                                    },
                                                })];
                                            case 1:
                                                result = _a.sent();
                                                return [4 /*yield*/, tx.ship.update({
                                                        where: { id: createDto.shipId },
                                                        data: {
                                                            politicalInstructor: user.realName,
                                                        },
                                                    })];
                                            case 2:
                                                _a.sent();
                                                return [4 /*yield*/, this.operationLogService.create({
                                                        userId: userId,
                                                        teamCode: teamCode,
                                                        operationType: '新增',
                                                        operationContent: "\u65B0\u589E\u6D3E\u4EFB\u8BB0\u5F55\uFF1A".concat(user.realName, " \u2192 ").concat(ship.cnShipName),
                                                    })];
                                            case 3:
                                                _a.sent();
                                                return [2 /*return*/, result];
                                        }
                                    });
                                }); })];
                    }
                });
            });
        };
        /**
         * 更新派任记录（下船/休假）
         */
        StaffAssignmentService_1.prototype.update = function (teamCode_1, id_1, updateDto_1) {
            return __awaiter(this, arguments, void 0, function (teamCode, id, updateDto, userId) {
                var existing, data, result;
                if (userId === void 0) { userId = 0; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.staffAssignment.findFirst({
                                where: { id: id, teamCode: teamCode },
                            })];
                        case 1:
                            existing = _a.sent();
                            if (!existing) {
                                throw new common_1.NotFoundException('派任记录不存在');
                            }
                            data = {};
                            if (updateDto.endDate !== undefined) {
                                data.endDate = updateDto.endDate ? new Date(updateDto.endDate) : null;
                            }
                            if (updateDto.status !== undefined) {
                                data.status = updateDto.status;
                            }
                            if (updateDto.remark !== undefined) {
                                data.remark = updateDto.remark;
                            }
                            if (updateDto.sourceCompany !== undefined) {
                                data.sourceCompany = updateDto.sourceCompany;
                            }
                            if (updateDto.assignmentNo !== undefined) {
                                data.assignmentNo = updateDto.assignmentNo;
                            }
                            return [4 /*yield*/, this.prisma.staffAssignment.update({
                                    where: { id: id },
                                    data: data,
                                    include: {
                                        user: { select: { id: true, realName: true, username: true } },
                                        ship: { select: { id: true, cnShipName: true } },
                                    },
                                })];
                        case 2:
                            result = _a.sent();
                            return [4 /*yield*/, this.operationLogService.create({
                                    userId: userId,
                                    teamCode: teamCode,
                                    operationType: '修改',
                                    operationContent: "\u4FEE\u6539\u6D3E\u4EFB\u8BB0\u5F55\uFF08ID:".concat(id, "\uFF09"),
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, result];
                    }
                });
            });
        };
        /**
         * 获取用户当前派任状态
         */
        StaffAssignmentService_1.prototype.getCurrentAssignment = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var now;
                return __generator(this, function (_a) {
                    now = new Date();
                    return [2 /*return*/, this.prisma.staffAssignment.findFirst({
                            where: {
                                userId: userId,
                                status: 'active',
                                startDate: { lte: now },
                                OR: [
                                    { endDate: null },
                                    { endDate: { gte: now } },
                                ],
                            },
                            include: {
                                ship: true,
                                user: { select: { id: true, realName: true, username: true, role: true } },
                            },
                            orderBy: { startDate: 'desc' },
                        })];
                });
            });
        };
        /**
         * 获取用户历史派任记录
         */
        StaffAssignmentService_1.prototype.getHistoryAssignments = function (userId, teamCode) {
            return __awaiter(this, void 0, void 0, function () {
                var where;
                return __generator(this, function (_a) {
                    where = { userId: userId };
                    if (teamCode) {
                        where.teamCode = teamCode;
                    }
                    return [2 /*return*/, this.prisma.staffAssignment.findMany({
                            where: where,
                            include: {
                                ship: true,
                                user: { select: { id: true, realName: true, username: true } },
                            },
                            orderBy: { startDate: 'desc' },
                        })];
                });
            });
        };
        /**
         * 检查用户是否在船
         */
        StaffAssignmentService_1.prototype.isUserOnBoard = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var assignment;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getCurrentAssignment(userId)];
                        case 1:
                            assignment = _a.sent();
                            return [2 /*return*/, assignment !== null && assignment.status === 'active' && assignment.endDate === null];
                    }
                });
            });
        };
        /**
         * 检查用户是否休假中
         */
        StaffAssignmentService_1.prototype.isUserOnLeave = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var now, assignment;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            now = new Date();
                            return [4 /*yield*/, this.prisma.staffAssignment.findFirst({
                                    where: {
                                        userId: userId,
                                        status: 'leave',
                                        startDate: { lte: now },
                                        OR: [
                                            { endDate: null },
                                            { endDate: { gte: now } },
                                        ],
                                    },
                                })];
                        case 1:
                            assignment = _a.sent();
                            return [2 /*return*/, assignment !== null];
                    }
                });
            });
        };
        /**
         * 获取用户派任记录（按用户）
         */
        StaffAssignmentService_1.prototype.getByUserId = function (userId, teamCode) {
            return __awaiter(this, void 0, void 0, function () {
                var where;
                return __generator(this, function (_a) {
                    where = { userId: userId };
                    if (teamCode) {
                        where.teamCode = teamCode;
                    }
                    return [2 /*return*/, this.prisma.staffAssignment.findMany({
                            where: where,
                            include: {
                                ship: true,
                                user: { select: { id: true, realName: true, username: true } },
                            },
                            orderBy: { startDate: 'desc' },
                        })];
                });
            });
        };
        /**
         * 获取船舶派任记录
         */
        StaffAssignmentService_1.prototype.getByShipId = function (shipId, teamCode) {
            return __awaiter(this, void 0, void 0, function () {
                var where;
                return __generator(this, function (_a) {
                    where = { shipId: shipId };
                    if (teamCode) {
                        where.teamCode = teamCode;
                    }
                    return [2 /*return*/, this.prisma.staffAssignment.findMany({
                            where: where,
                            include: {
                                user: { select: { id: true, realName: true, username: true } },
                            },
                            orderBy: { startDate: 'desc' },
                        })];
                });
            });
        };
        /**
         * 获取船舶当前在船人员
         */
        StaffAssignmentService_1.prototype.getCurrentShipStaff = function (shipId, teamCode) {
            return __awaiter(this, void 0, void 0, function () {
                var now;
                return __generator(this, function (_a) {
                    now = new Date();
                    return [2 /*return*/, this.prisma.staffAssignment.findMany({
                            where: {
                                shipId: shipId,
                                teamCode: teamCode,
                                status: 'active',
                                startDate: { lte: now },
                                OR: [
                                    { endDate: null },
                                    { endDate: { gte: now } },
                                ],
                            },
                            include: {
                                user: { select: { id: true, realName: true, username: true } },
                            },
                            orderBy: { startDate: 'desc' },
                        })];
                });
            });
        };
        /**
         * 下船登记
         */
        StaffAssignmentService_1.prototype.checkOutShip = function (id, endDate, reason, userId, teamCode) {
            return __awaiter(this, void 0, void 0, function () {
                var existing, result;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.staffAssignment.findFirst({
                                where: { id: id, teamCode: teamCode },
                                include: { ship: true, user: { select: { id: true, realName: true, username: true } } },
                            })];
                        case 1:
                            existing = _a.sent();
                            if (!existing) {
                                throw new common_1.NotFoundException('派任记录不存在');
                            }
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var updated;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.staffAssignment.update({
                                                    where: { id: id },
                                                    data: {
                                                        endDate: new Date(endDate),
                                                        status: 'ended',
                                                        remark: reason,
                                                    },
                                                    include: {
                                                        user: { select: { id: true, realName: true, username: true } },
                                                        ship: { select: { id: true, cnShipName: true } },
                                                    },
                                                })];
                                            case 1:
                                                updated = _a.sent();
                                                return [4 /*yield*/, tx.ship.update({
                                                        where: { id: existing.shipId },
                                                        data: {
                                                            politicalInstructor: null,
                                                        },
                                                    })];
                                            case 2:
                                                _a.sent();
                                                return [2 /*return*/, updated];
                                        }
                                    });
                                }); })];
                        case 2:
                            result = _a.sent();
                            return [4 /*yield*/, this.operationLogService.create({
                                    userId: userId,
                                    teamCode: teamCode,
                                    operationType: '修改',
                                    operationContent: "\u4E0B\u8239\u767B\u8BB0\uFF1A".concat(existing.user.realName, " \u79BB\u5F00 ").concat(existing.ship.cnShipName),
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, result];
                    }
                });
            });
        };
        /**
         * 休假登记
         */
        StaffAssignmentService_1.prototype.startLeave = function (id, startDate, endDate, reason, userId, teamCode) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.update(teamCode, id, {
                            endDate: endDate || undefined,
                            status: 'leave',
                            remark: reason,
                        }, userId)];
                });
            });
        };
        /**
         * 销假（从休假回到工作状态）
         */
        StaffAssignmentService_1.prototype.endLeave = function (id, userId, teamCode) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.update(teamCode, id, {
                            status: 'active',
                            remark: '销假',
                        }, userId)];
                });
            });
        };
        /**
         * 获取用户权限信息（用于日记查询）
         */
        StaffAssignmentService_1.prototype.getUserDiaryPermission = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var currentAssignment, historyAssignments, isOnLeave, isOnBoard;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getCurrentAssignment(userId)];
                        case 1:
                            currentAssignment = _a.sent();
                            return [4 /*yield*/, this.getHistoryAssignments(userId)];
                        case 2:
                            historyAssignments = _a.sent();
                            return [4 /*yield*/, this.isUserOnLeave(userId)];
                        case 3:
                            isOnLeave = _a.sent();
                            return [4 /*yield*/, this.isUserOnBoard(userId)];
                        case 4:
                            isOnBoard = _a.sent();
                            return [2 /*return*/, {
                                    currentShipId: (currentAssignment === null || currentAssignment === void 0 ? void 0 : currentAssignment.shipId) || null,
                                    historyShipIds: historyAssignments.map(function (a) { return a.shipId; }),
                                    isOnLeave: isOnLeave,
                                    isOnBoard: isOnBoard,
                                }];
                    }
                });
            });
        };
        StaffAssignmentService_1.prototype.delete = function (teamCode_1, id_1) {
            return __awaiter(this, arguments, void 0, function (teamCode, id, userId) {
                var existing, result;
                if (userId === void 0) { userId = 0; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.staffAssignment.findFirst({
                                where: { id: id, teamCode: teamCode },
                            })];
                        case 1:
                            existing = _a.sent();
                            if (!existing) {
                                throw new common_1.NotFoundException('派任记录不存在');
                            }
                            return [4 /*yield*/, this.prisma.staffAssignment.delete({
                                    where: { id: id },
                                })];
                        case 2:
                            result = _a.sent();
                            return [4 /*yield*/, this.operationLogService.create({
                                    userId: userId,
                                    teamCode: teamCode,
                                    operationType: '删除',
                                    operationContent: "\u5220\u9664\u6D3E\u4EFB\u8BB0\u5F55\uFF08ID:".concat(id, "\uFF09"),
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, result];
                    }
                });
            });
        };
        return StaffAssignmentService_1;
    }());
    __setFunctionName(_classThis, "StaffAssignmentService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        StaffAssignmentService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return StaffAssignmentService = _classThis;
}();
exports.StaffAssignmentService = StaffAssignmentService;
