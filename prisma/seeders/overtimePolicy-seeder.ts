import { DayType } from '@prisma/client';
import client from '../../src/database/client';
import { v4 as uuidV4 } from 'uuid';

// Defaults CLT (art. 59 da CLT): 50% em dia útil/sábado, 100% em domingo e
// feriado. Editável pelo RH depois via API (ver overtimePolicy module).
const DEFAULT_POLICIES: { dayType: DayType; percentage: number }[] = [
  { dayType: DayType.WEEKDAY, percentage: 0.5 },
  { dayType: DayType.SATURDAY, percentage: 0.5 },
  { dayType: DayType.SUNDAY_HOLIDAY, percentage: 1 },
];

export const overtimePolicySeeder = async () => {
  for (const policy of DEFAULT_POLICIES) {
    const exists = await client.overtimePolicy.findUnique({
      where: { dayType: policy.dayType },
    });
    if (!exists) {
      await client.overtimePolicy.create({
        data: { id: uuidV4(), ...policy },
      });
    }
  }

  console.log('Overtime policies seeded');
};
