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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveDto = exports.CheckOutDto = exports.UpdateStaffAssignmentDto = exports.CreateStaffAssignmentDto = void 0;
var class_validator_1 = require("class-validator");
var CreateStaffAssignmentDto = function () {
    var _a;
    var _userId_decorators;
    var _userId_initializers = [];
    var _userId_extraInitializers = [];
    var _shipId_decorators;
    var _shipId_initializers = [];
    var _shipId_extraInitializers = [];
    var _startDate_decorators;
    var _startDate_initializers = [];
    var _startDate_extraInitializers = [];
    var _endDate_decorators;
    var _endDate_initializers = [];
    var _endDate_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    var _sourceCompany_decorators;
    var _sourceCompany_initializers = [];
    var _sourceCompany_extraInitializers = [];
    var _assignmentNo_decorators;
    var _assignmentNo_initializers = [];
    var _assignmentNo_extraInitializers = [];
    var _remark_decorators;
    var _remark_initializers = [];
    var _remark_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateStaffAssignmentDto() {
                this.userId = __runInitializers(this, _userId_initializers, void 0);
                this.shipId = (__runInitializers(this, _userId_extraInitializers), __runInitializers(this, _shipId_initializers, void 0));
                this.startDate = (__runInitializers(this, _shipId_extraInitializers), __runInitializers(this, _startDate_initializers, void 0));
                this.endDate = (__runInitializers(this, _startDate_extraInitializers), __runInitializers(this, _endDate_initializers, void 0));
                this.status = (__runInitializers(this, _endDate_extraInitializers), __runInitializers(this, _status_initializers, void 0));
                this.sourceCompany = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _sourceCompany_initializers, void 0));
                this.assignmentNo = (__runInitializers(this, _sourceCompany_extraInitializers), __runInitializers(this, _assignmentNo_initializers, void 0));
                this.remark = (__runInitializers(this, _assignmentNo_extraInitializers), __runInitializers(this, _remark_initializers, void 0));
                __runInitializers(this, _remark_extraInitializers);
            }
            return CreateStaffAssignmentDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _userId_decorators = [(0, class_validator_1.IsNumber)()];
            _shipId_decorators = [(0, class_validator_1.IsNumber)()];
            _startDate_decorators = [(0, class_validator_1.IsDateString)()];
            _endDate_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsDateString)()];
            _status_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _sourceCompany_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _assignmentNo_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _remark_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: function (obj) { return "userId" in obj; }, get: function (obj) { return obj.userId; }, set: function (obj, value) { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
            __esDecorate(null, null, _shipId_decorators, { kind: "field", name: "shipId", static: false, private: false, access: { has: function (obj) { return "shipId" in obj; }, get: function (obj) { return obj.shipId; }, set: function (obj, value) { obj.shipId = value; } }, metadata: _metadata }, _shipId_initializers, _shipId_extraInitializers);
            __esDecorate(null, null, _startDate_decorators, { kind: "field", name: "startDate", static: false, private: false, access: { has: function (obj) { return "startDate" in obj; }, get: function (obj) { return obj.startDate; }, set: function (obj, value) { obj.startDate = value; } }, metadata: _metadata }, _startDate_initializers, _startDate_extraInitializers);
            __esDecorate(null, null, _endDate_decorators, { kind: "field", name: "endDate", static: false, private: false, access: { has: function (obj) { return "endDate" in obj; }, get: function (obj) { return obj.endDate; }, set: function (obj, value) { obj.endDate = value; } }, metadata: _metadata }, _endDate_initializers, _endDate_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            __esDecorate(null, null, _sourceCompany_decorators, { kind: "field", name: "sourceCompany", static: false, private: false, access: { has: function (obj) { return "sourceCompany" in obj; }, get: function (obj) { return obj.sourceCompany; }, set: function (obj, value) { obj.sourceCompany = value; } }, metadata: _metadata }, _sourceCompany_initializers, _sourceCompany_extraInitializers);
            __esDecorate(null, null, _assignmentNo_decorators, { kind: "field", name: "assignmentNo", static: false, private: false, access: { has: function (obj) { return "assignmentNo" in obj; }, get: function (obj) { return obj.assignmentNo; }, set: function (obj, value) { obj.assignmentNo = value; } }, metadata: _metadata }, _assignmentNo_initializers, _assignmentNo_extraInitializers);
            __esDecorate(null, null, _remark_decorators, { kind: "field", name: "remark", static: false, private: false, access: { has: function (obj) { return "remark" in obj; }, get: function (obj) { return obj.remark; }, set: function (obj, value) { obj.remark = value; } }, metadata: _metadata }, _remark_initializers, _remark_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateStaffAssignmentDto = CreateStaffAssignmentDto;
var UpdateStaffAssignmentDto = function () {
    var _a;
    var _endDate_decorators;
    var _endDate_initializers = [];
    var _endDate_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    var _sourceCompany_decorators;
    var _sourceCompany_initializers = [];
    var _sourceCompany_extraInitializers = [];
    var _assignmentNo_decorators;
    var _assignmentNo_initializers = [];
    var _assignmentNo_extraInitializers = [];
    var _remark_decorators;
    var _remark_initializers = [];
    var _remark_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateStaffAssignmentDto() {
                this.endDate = __runInitializers(this, _endDate_initializers, void 0);
                this.status = (__runInitializers(this, _endDate_extraInitializers), __runInitializers(this, _status_initializers, void 0));
                this.sourceCompany = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _sourceCompany_initializers, void 0));
                this.assignmentNo = (__runInitializers(this, _sourceCompany_extraInitializers), __runInitializers(this, _assignmentNo_initializers, void 0));
                this.remark = (__runInitializers(this, _assignmentNo_extraInitializers), __runInitializers(this, _remark_initializers, void 0));
                __runInitializers(this, _remark_extraInitializers);
            }
            return UpdateStaffAssignmentDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _endDate_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsDateString)()];
            _status_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _sourceCompany_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _assignmentNo_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _remark_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _endDate_decorators, { kind: "field", name: "endDate", static: false, private: false, access: { has: function (obj) { return "endDate" in obj; }, get: function (obj) { return obj.endDate; }, set: function (obj, value) { obj.endDate = value; } }, metadata: _metadata }, _endDate_initializers, _endDate_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            __esDecorate(null, null, _sourceCompany_decorators, { kind: "field", name: "sourceCompany", static: false, private: false, access: { has: function (obj) { return "sourceCompany" in obj; }, get: function (obj) { return obj.sourceCompany; }, set: function (obj, value) { obj.sourceCompany = value; } }, metadata: _metadata }, _sourceCompany_initializers, _sourceCompany_extraInitializers);
            __esDecorate(null, null, _assignmentNo_decorators, { kind: "field", name: "assignmentNo", static: false, private: false, access: { has: function (obj) { return "assignmentNo" in obj; }, get: function (obj) { return obj.assignmentNo; }, set: function (obj, value) { obj.assignmentNo = value; } }, metadata: _metadata }, _assignmentNo_initializers, _assignmentNo_extraInitializers);
            __esDecorate(null, null, _remark_decorators, { kind: "field", name: "remark", static: false, private: false, access: { has: function (obj) { return "remark" in obj; }, get: function (obj) { return obj.remark; }, set: function (obj, value) { obj.remark = value; } }, metadata: _metadata }, _remark_initializers, _remark_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateStaffAssignmentDto = UpdateStaffAssignmentDto;
var CheckOutDto = function () {
    var _a;
    var _endDate_decorators;
    var _endDate_initializers = [];
    var _endDate_extraInitializers = [];
    var _reason_decorators;
    var _reason_initializers = [];
    var _reason_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CheckOutDto() {
                this.endDate = __runInitializers(this, _endDate_initializers, void 0);
                this.reason = (__runInitializers(this, _endDate_extraInitializers), __runInitializers(this, _reason_initializers, void 0));
                __runInitializers(this, _reason_extraInitializers);
            }
            return CheckOutDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _endDate_decorators = [(0, class_validator_1.IsDateString)()];
            _reason_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _endDate_decorators, { kind: "field", name: "endDate", static: false, private: false, access: { has: function (obj) { return "endDate" in obj; }, get: function (obj) { return obj.endDate; }, set: function (obj, value) { obj.endDate = value; } }, metadata: _metadata }, _endDate_initializers, _endDate_extraInitializers);
            __esDecorate(null, null, _reason_decorators, { kind: "field", name: "reason", static: false, private: false, access: { has: function (obj) { return "reason" in obj; }, get: function (obj) { return obj.reason; }, set: function (obj, value) { obj.reason = value; } }, metadata: _metadata }, _reason_initializers, _reason_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CheckOutDto = CheckOutDto;
var LeaveDto = function () {
    var _a;
    var _startDate_decorators;
    var _startDate_initializers = [];
    var _startDate_extraInitializers = [];
    var _endDate_decorators;
    var _endDate_initializers = [];
    var _endDate_extraInitializers = [];
    var _reason_decorators;
    var _reason_initializers = [];
    var _reason_extraInitializers = [];
    return _a = /** @class */ (function () {
            function LeaveDto() {
                this.startDate = __runInitializers(this, _startDate_initializers, void 0);
                this.endDate = (__runInitializers(this, _startDate_extraInitializers), __runInitializers(this, _endDate_initializers, void 0));
                this.reason = (__runInitializers(this, _endDate_extraInitializers), __runInitializers(this, _reason_initializers, void 0));
                __runInitializers(this, _reason_extraInitializers);
            }
            return LeaveDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _startDate_decorators = [(0, class_validator_1.IsDateString)()];
            _endDate_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsDateString)()];
            _reason_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _startDate_decorators, { kind: "field", name: "startDate", static: false, private: false, access: { has: function (obj) { return "startDate" in obj; }, get: function (obj) { return obj.startDate; }, set: function (obj, value) { obj.startDate = value; } }, metadata: _metadata }, _startDate_initializers, _startDate_extraInitializers);
            __esDecorate(null, null, _endDate_decorators, { kind: "field", name: "endDate", static: false, private: false, access: { has: function (obj) { return "endDate" in obj; }, get: function (obj) { return obj.endDate; }, set: function (obj, value) { obj.endDate = value; } }, metadata: _metadata }, _endDate_initializers, _endDate_extraInitializers);
            __esDecorate(null, null, _reason_decorators, { kind: "field", name: "reason", static: false, private: false, access: { has: function (obj) { return "reason" in obj; }, get: function (obj) { return obj.reason; }, set: function (obj, value) { obj.reason = value; } }, metadata: _metadata }, _reason_initializers, _reason_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.LeaveDto = LeaveDto;
