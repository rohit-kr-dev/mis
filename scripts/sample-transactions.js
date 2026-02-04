// Simple test script to add sample data for deletion testing
const sampleTransactions = [
  {
    dateOfBooking: '2024-01-15',
    vendor: 'Test Vendor 1',
    port: 'Chennai',
    grade: 'Test Grade A',
    qty: '1000',
    commission: '15',
    commissionCurrency: 'USD',
    exchRate: '83.5000',
    customDuty: '7.5',
    calculatedCustomDuty: '8.25',
    bookingRate: '50',
    clearanceCharges: '2000',
    netLanded: '4.56',
    status: 'Not Yet Arrived',
    completed: 'Pending'
  },
  {
    dateOfBooking: '2024-01-20',
    vendor: 'Test Vendor 2',
    port: 'JNPT',
    grade: 'Test Grade B',
    qty: '500',
    commission: '10',
    commissionCurrency: 'INR',
    exchRate: '83.5000',
    customDuty: '5',
    calculatedCustomDuty: '5.50',
    bookingRate: '75',
    clearanceCharges: '1500',
    netLanded: '6.89',
    status: 'Arrived',
    completed: 'Done'
  }
];

console.log('Sample transactions created for testing:');
console.log(JSON.stringify(sampleTransactions, null, 2));
console.log('\nTo test deletion:');
console.log('1. Add these transactions through the UI');
console.log('2. Try deleting them using the delete button');
console.log('3. Verify they are removed from the table');