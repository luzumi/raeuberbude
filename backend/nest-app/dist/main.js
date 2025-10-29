"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    const config = app.get(config_1.ConfigService);
    const origins = (config.get('CORS_ORIGINS') || 'http://localhost:4200,http://127.0.0.1:4200')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || origins.includes(origin))
                return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    });
    const port = parseInt(config.get('NEST_PORT') || '3001', 10);
    await app.listen(port);
    console.log(`NestJS API listening on http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map