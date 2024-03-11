import * as dayjs from 'dayjs';
import envConfig from '../../src/config/env.config';
import userRepository from '../../src/modules/user/user.repository';
import { encryptPassword } from '../../src/utils/encryption';
import { removeNonNumbersCharacters } from '../../src/utils/removeNonNumbersCharacters';

export const userSeeder = async () => {
  const user = {
    name: envConfig.humanResources.name,
    cpf: envConfig.humanResources.cpf,
    phone: envConfig.humanResources.phone,
    email: envConfig.humanResources.email,
    password: await encryptPassword(envConfig.humanResources.password),
    department: envConfig.humanResources.department,
    birthDate: dayjs(envConfig.humanResources.birthDate).format(),
    isHumanResources: true,
  };

  const userExists = await userRepository.getOneUser({
    OR: [{ cpf: removeNonNumbersCharacters(user.cpf) }, { email: user.email }],
  });

  if (!userExists) {
    await userRepository.createUser({
      ...user,
      phone: removeNonNumbersCharacters(user.phone),
      cpf: removeNonNumbersCharacters(user.cpf),
    });
  } else {
    await userRepository.updateUser(userExists.id, {
      ...user,
      cpf: removeNonNumbersCharacters(user.cpf),
      phone: removeNonNumbersCharacters(user.phone),
    });
  }

  console.log('User seeded');
};
