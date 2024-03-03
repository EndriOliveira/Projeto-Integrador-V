import { InternalServerErrorException } from '@nestjs/common';
import * as SendGrid from '@sendgrid/mail';
import envConfig from '../../config/env.config';

export const sendMail = async (
  mail: SendGrid.MailDataRequired,
): Promise<any> => {
  try {
    SendGrid.setApiKey(envConfig.sendGrid.key);
    return await SendGrid.send(mail);
  } catch (error) {
    throw new InternalServerErrorException('Internal Server Error');
  }
};
