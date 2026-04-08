import { otpTypeEnum } from '../../db/schema';

export type OtpType = (typeof otpTypeEnum.enumValues)[number];
