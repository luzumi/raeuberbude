"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const users_module_1 = require("./users/users.module");
const health_module_1 = require("./health/health.module");
function buildMongoUri(config) {
    const direct = config.get('MONGO_URI');
    if (direct)
        return direct;
    const host = config.get('MONGO_HOST', 'localhost');
    const port = config.get('MONGO_PORT', '27017');
    const db = config.get('MONGO_DB', 'raueberbude');
    const user = config.get('MONGO_USER');
    const pass = config.get('MONGO_PASSWORD');
    const authSource = config.get('MONGO_AUTH_SOURCE', 'admin');
    if (user && pass) {
        return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}?authSource=${authSource}`;
    }
    return `mongodb://${host}:${port}/${db}`;
}
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: [
                    '../.env',
                    '.env',
                ],
            }),
            mongoose_1.MongooseModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    uri: buildMongoUri(config),
                }),
            }),
            users_module_1.UsersModule,
            health_module_1.HealthModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map