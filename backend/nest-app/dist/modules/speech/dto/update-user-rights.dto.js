"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUserRightsDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_user_rights_dto_1 = require("./create-user-rights.dto");
class UpdateUserRightsDto extends (0, mapped_types_1.PartialType)(create_user_rights_dto_1.CreateUserRightsDto) {
}
exports.UpdateUserRightsDto = UpdateUserRightsDto;
//# sourceMappingURL=update-user-rights.dto.js.map