import { IsString, IsObject, IsOptional } from 'class-validator';

export class StripeWebhookDto {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsObject()
  data: {
    object: any;
  };

  @IsString()
  @IsOptional()
  livemode?: boolean;
}
