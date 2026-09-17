import { overtimePolicySeeder } from './overtimePolicy-seeder';
import { userSeeder } from './user-seeder';

(async () => {
  try {
    await userSeeder();
    await overtimePolicySeeder();
  } catch {
    console.log('Error seeding data');
  }
})();
