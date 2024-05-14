import { InternalServerErrorException, Logger } from '@nestjs/common';
import * as SendGrid from '@sendgrid/mail';
import envConfig from '../../config/env.config';

export const sendMail = async (
  mail: SendGrid.MailDataRequired,
): Promise<any> => {
  try {
    Logger.log('Sending email', 'sendMail');
    SendGrid.setApiKey(envConfig.sendGrid.key);
    const emailSent = await SendGrid.send(mail);
    Logger.log(`Email sent`, 'sendMail');
    return emailSent;
  } catch (error) {
    Logger.error(error.message, 'sendMail');
    throw new InternalServerErrorException('Erro Interno de Servidor');
  }
};
