import { userSeeder } from './user-seeder';

(async () => {
  try {
    await userSeeder();
  } catch {
    console.log('Error seeding users');
  }
})();
