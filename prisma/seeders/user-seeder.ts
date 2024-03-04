import * as dayjs from 'dayjs';
import envConfig from '../../src/config/env.config';
import userRepository from '../../src/modules/user/user.repository';
import { encryptPassword } from '../../src/utils/encryption';
import { removeNonNumbersCharacters } from '../../src/utils/removeNonNumbersCharacters';

export const userSeeder = async () => {
  const users = [
    {
      name: 'John Doe',
      cpf: '99999999999',
      phone: '999999999',
      email: envConfig.humanResources.email,
      password: await encryptPassword(envConfig.humanResources.email),
      department: 'Desenvolvedor',
      birthDate: dayjs(new Date()).subtract(14, 'year').format(),
      isHumanResources: true,
    },
  ];
  for (const user of users) {
    const userExists = await userRepository.getOneUser({
      OR: [
        { cpf: removeNonNumbersCharacters(user.cpf) },
        { email: user.email },
      ],
    });

    if (!userExists) {
      await userRepository.createUser({
        ...user,
        phone: removeNonNumbersCharacters(user.phone),
        cpf: removeNonNumbersCharacters(user.cpf),
        birthDate: user.birthDate,
      });
    }
  }
};
