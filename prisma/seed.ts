import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create test data for two users
  const users = [
    { email: 'dotnetcsharp@hotmail.com', name: 'Fabio Santini' },
    { email: 'developever71@gmail.com', name: 'Developer Test' }
  ];

  for (const user of users) {
    console.log(`Creating data for ${user.email}...`);

    // Create settings for each user
    await prisma.settings.upsert({
      where: { user_email: user.email },
      update: {},
      create: {
        user_email: user.email,
        automatic_login: true,
        default_currency: 'EUR',
        date_format: 'DD/MM/YYYY',
        language: 'it',
        theme: 'light'
      }
    });

    // Create customers for meal expenses
    const customers = [
      { name: 'Microsoft Italia', company: 'Microsoft Corporation' },
      { name: 'Google Italy', company: 'Google LLC' },
      { name: 'Amazon Web Services', company: 'Amazon' }
    ];

    for (const customer of customers) {
      await prisma.customer.upsert({
        where: {
          user_email_name: {
            user_email: user.email,
            name: customer.name
          }
        },
        update: {},
        create: {
          user_email: user.email,
          name: customer.name,
          company: customer.company
        }
      });
    }

    // Create colleagues for meal expenses
    const colleagues = [
      { name: 'Mario Rossi', email: 'mario.rossi@company.com', department: 'Engineering' },
      { name: 'Giulia Bianchi', email: 'giulia.bianchi@company.com', department: 'Sales' },
      { name: 'Luca Verdi', email: 'luca.verdi@company.com', department: 'Marketing' }
    ];

    for (const colleague of colleagues) {
      await prisma.colleague.upsert({
        where: {
          user_email_name: {
            user_email: user.email,
            name: colleague.name
          }
        },
        update: {},
        create: {
          user_email: user.email,
          name: colleague.name,
          email: colleague.email,
          department: colleague.department
        }
      });
    }

    // Create expense reports for the last 3 months
    const now = new Date();
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const reportDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      const month = reportDate.getMonth() + 1;
      const year = reportDate.getFullYear();
      const monthName = reportDate.toLocaleString('en', { month: 'long' });

      const report = await prisma.expenseReport.create({
        data: {
          user_email: user.email,
          user_name: user.name,
          title: `${monthName} ${year} Expenses`,
          month: month,
          year: year,
          description: `Expense report for ${monthName} ${year}`,
          status: monthOffset === 0 ? 'draft' : 'submitted',
          total_amount: 0
        }
      });

      // Create various expense lines for each report
      const expenses = [
        {
          type: 'PARKING',
          description: 'Airport parking',
          amount: 25.00,
          date: new Date(year, month - 1, 5)
        },
        {
          type: 'FUEL',
          description: 'Fuel for business trip to Milan',
          amount: 85.50,
          date: new Date(year, month - 1, 7),
          metadata: JSON.stringify({
            startLocation: 'Rome, Italy',
            endLocation: 'Milan, Italy',
            kilometers: 572
          })
        },
        {
          type: 'LUNCH',
          description: 'Business lunch with Microsoft Italia',
          amount: 45.00,
          date: new Date(year, month - 1, 10),
          metadata: JSON.stringify({
            customer: 'Microsoft Italia',
            colleagues: ['Mario Rossi']
          })
        },
        {
          type: 'HOTEL',
          description: 'Hotel Hilton Milan',
          amount: 180.00,
          date: new Date(year, month - 1, 12),
          metadata: JSON.stringify({
            nights: 2,
            location: 'Milan, Italy'
          })
        },
        {
          type: 'DINNER',
          description: 'Team dinner',
          amount: 65.00,
          date: new Date(year, month - 1, 15),
          metadata: JSON.stringify({
            customer: null,
            colleagues: ['Giulia Bianchi', 'Luca Verdi']
          })
        },
        {
          type: 'TRAIN',
          description: 'Train ticket Rome-Milan return',
          amount: 120.00,
          date: new Date(year, month - 1, 20)
        },
        {
          type: 'TELEPASS',
          description: 'Highway toll',
          amount: 23.40,
          date: new Date(year, month - 1, 22)
        },
        {
          type: 'BREAKFAST',
          description: 'Business breakfast meeting',
          amount: 18.00,
          date: new Date(year, month - 1, 25),
          metadata: JSON.stringify({
            customer: 'Google Italy',
            colleagues: []
          })
        }
      ];

      let totalAmount = 0;
      for (const expense of expenses) {
        await prisma.expenseLine.create({
          data: {
            report_id: report.id,
            user_email: user.email,
            type: expense.type,
            description: expense.description,
            amount: expense.amount,
            date: expense.date,
            currency: 'EUR',
            metadata: expense.metadata || null,
            receipt_url: Math.random() > 0.5 ? `https://saeiexpenses.blob.core.windows.net/receipts/sample-${Math.random().toString(36).substr(2, 9)}.jpg` : null,
            ocr_processed: false
          }
        });
        totalAmount += expense.amount;
      }

      // Update report total
      await prisma.expenseReport.update({
        where: { id: report.id },
        data: { total_amount: totalAmount }
      });

      console.log(`✅ Created report for ${monthName} ${year} with €${totalAmount} in expenses`);
    }
  }

  console.log('✅ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });