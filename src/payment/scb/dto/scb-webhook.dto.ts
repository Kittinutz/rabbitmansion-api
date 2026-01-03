import { IsString, IsNumber, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ScbWebhookDto {
  @IsString()
  transactionId: string;

  @IsString()
  billPaymentRef1: string;

  @IsString()
  @IsOptional()
  billPaymentRef2?: string;

  @IsString()
  @IsOptional()
  billPaymentRef3?: string;

  @IsNumber()
  amount: number;

  @IsString()
  status: string;

  @Type(() => Date)
  @IsDate()
  paidAt: Date;

  @IsString()
  @IsOptional()
  sendingBank?: string;

  @IsString()
  @IsOptional()
  payerAccount?: string;
}
