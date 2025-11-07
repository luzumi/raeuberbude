"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeechModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const speech_controller_1 = require("./speech.controller");
const speech_service_1 = require("./speech.service");
const rights_service_1 = require("./rights.service");
const terminals_service_1 = require("./terminals.service");
const human_input_schema_1 = require("./schemas/human-input.schema");
const app_terminal_schema_1 = require("./schemas/app-terminal.schema");
const user_rights_schema_1 = require("./schemas/user-rights.schema");
const users_module_1 = require("../../users/users.module");
let SpeechModule = class SpeechModule {
};
exports.SpeechModule = SpeechModule;
exports.SpeechModule = SpeechModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: human_input_schema_1.HumanInput.name, schema: human_input_schema_1.HumanInputSchema },
                { name: app_terminal_schema_1.AppTerminal.name, schema: app_terminal_schema_1.AppTerminalSchema },
                { name: user_rights_schema_1.UserRights.name, schema: user_rights_schema_1.UserRightsSchema },
            ]),
            users_module_1.UsersModule,
        ],
        controllers: [speech_controller_1.SpeechController],
        providers: [speech_service_1.SpeechService, rights_service_1.RightsService, terminals_service_1.TerminalsService],
        exports: [speech_service_1.SpeechService, rights_service_1.RightsService, terminals_service_1.TerminalsService],
    })
], SpeechModule);
//# sourceMappingURL=speech.module.js.map